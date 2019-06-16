// Helper Functions for Update Poll Service
const Q = require('q');

/* ENVIRONMENT VARIABLES */
const PATH = process.env.PATH;

/* LOAD CLIENTS/MODULES */
const PostgreSQL = require(PATH + '/skills/utils/postgres');
const CommonService = require(PATH + '/skills/utils/common');

var service = {};

service.ValidateInput = ValidateInput;
service.ValidatePollStarted = ValidatePollStarted;

module.exports = service;

/* Helper function to validate update command */
function ValidateInput(input, user_id) {
  var deferred = Q.defer();
  var group_name = input.trim().replace(/[^\x00-\x7F]/g, "").toUpperCase();
  if (group_name.length == 0) {
    console.log('VALIDATE UPDATE POLL INPUT. GROUP NAME IS ABSENT');
    // set group_name as primary group for user
    CommonService.GetPrimaryGroupById(user_id)
      .then(function(primary_group) {
        console.log(primary_group);
        deferred.resolve(primary_group);
      })
      .catch(function(error) {
        deferred.reject(error);
      });
  } else {
    // Validate group
    CommonService.ValidateGroup(group_name)
      .then(function() {
        // Validate requestor
        CommonService.ValidatePersonInGroup(user_id, group_name)
          .then(function() {
            // Validation complete
            deferred.resolve(group_name);
          })
          .catch(function(error) {
            deferred.reject(error);
          });
      })
      .catch(function(error) {
        deferred.reject(error);
      });
  }
  return deferred.promise;
}

/* Helper function to validate that user has done a poll already */
function ValidatePollStarted(group_name, user_id) {
  var deferred = Q.defer();
  // Establish client POSTGRESQL
  const client = PostgreSQL.CreateClient();
  client.connect(function(err) {
    if (err) throw err;
    // get person's poll result
    client.query('SELECT * FROM ' + TABLE_NAME + ' WHERE group_name=$1 AND person_id=$2 AND poll_result IS NOT NULL AND poll_timestamp IS NOT NULL;',
      [group_name, user_id],
      function(err, res) {
        if (err) throw err;
        client.end(function(err) {
          if (err) throw err;
          if (res.rows.length != 0) {
            // poll has started and user has responded
            deferred.resolve('update poll valid');
          } else {
            var err = '\u274c You have not participated in a poll for group: ' + group_name +
            '. To start a poll use command: `poll [group_name].`';
            deferred.reject(err);
          }
        });
      });
  });
  return deferred.promise;
}
