// Helper Functions for Update Poll Service
const Q = require('q');

/* ENVIRONMENT VARIABLES */
const PATH = process.env.PATH;
const TABLE_NAME = process.env.TABLE_NAME;

/* LOAD CLIENTS/MODULES */
const PostgreSQL = require(PATH + '/skills/utils/postgres');
const CommonService = require(PATH + '/skills/utils/common');

var service = {};

service.ValidatePollStarted = ValidatePollStarted;

module.exports = service;

/* Helper function to validate that user has done a poll already */
function ValidatePollStarted(group_name, user_id) {
  var deferred = Q.defer();
  // Establish client POSTGRESQL
  const client = PostgreSQL.CreateClient();
  client.connect(function(err) {
    if (err) throw err;
    // get person's poll result
    client.query('SELECT * FROM ' + TABLE_NAME + ' WHERE group_name=$1 AND person_id=$2 AND poll_timestamp IS NOT NULL;',
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
