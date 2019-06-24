// Helper Functions for Poke Service
const Q = require('q');

/* ENVIRONMENT VARIABLES */
const PATH = process.env.PATH;
const TABLE_NAME = process.env.TABLE_NAME;

/* LOAD CLIENTS/MODULES */
const PostgreSQL = require(PATH + '/skills/utils/postgres');
const CommonService = require(PATH + '/skills/utils/common');

/* CONSTANTS */
const POKE_INTERVAL = 1000 * 60 * 20;

var service = {};

service.ValidateInput = ValidateInput;
service.IsPokeValid = IsPokeValid;
service.GetPollersInProgressIDs = GetPollersInProgressIDs;

module.exports = service;

/* Helper function to validate update command */
function ValidateInput(input, user_id) {
  var deferred = Q.defer();
  var group_name = input.trim().replace(/[^\x00-\x7F]/g, "").toUpperCase();
  if (group_name.length == 0) {
    // set group_name as primary group for user
    CommonService.GetPrimaryGroupById(user_id)
      .then(function(primary_group) {
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

/* Helper function to determine if a poke is valid */
async function IsPokeValid(group_name) {
  var deferred = Q.defer();
  var timestamp = await CommonService.GetPollTimestamp(group_name);
  // POLL IN PROGRESS CONDITION
  if (timestamp == -1) {
    var err = 'No poll is in progress for ' + group_name + '.';
    deferred.reject(err);
  }
  // POLL MUST BE ALLOWED TO BE CONDUCTED FOR AT LEAST 30 MINS BEFORE A POKE CAN BE SENT
  const time_passed = Date.now() - timestamp;
  if (time_passed < POKE_INTERVAL) {
    var err = '\u274c Poke request denied. A poll was started less than 30 minutes ago.' +
      ' Please wait until this period has passed before sending a poke to ' + group_name + '.';
    deferred.reject(err);
  }
  deferred.resolve('poke valid');
  return deferred.promise;
}

/* Helper function to get user IDs of all pollers in progress in a group */
function GetPollersInProgressIDs(group_name) {
  return new Promise(resolve => {
    // Establish client POSTGRESQL
    const client = PostgreSQL.CreateClient();
    client.connect(function(err) {
      if (err) throw err;
      // get pollers who are in progress
      client.query('SELECT person_name AS name, person_id AS id FROM ' + TABLE_NAME + ' WHERE group_name=$1 AND poll_in_progress=$2;',
        [group_name, true],
        function(err, res) {
          if (err) throw err;
          client.end(function(err) {
            if (err) throw err;
            resolve(res.rows);
          });
        });
    });
  });
}
