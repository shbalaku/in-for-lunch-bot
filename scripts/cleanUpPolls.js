// Clean up polls older than 1 day
const Q = require('q');

/* ENVIRONMENT VARIABLES */
const TABLE_NAME = process.env.TABLE_NAME;

/* LOAD CLIENTS/MODULES */
const PostgreSQL = require('./../skills/utils/postgres');
const CommonService = require('./../skills/utils/common');

/* Function to get all group names in a list */
function getAllGroupNames() {
  return new Promise(resolve => {
    var groups = [];
    // Establish client POSTGRESQL
    const client = PostgreSQL.CreateClient();
    client.connect(function(err) {
      if (err) throw err;
      // get all group names in table
      client.query('SELECT DISTINCT group_name AS name FROM ' + TABLE_NAME + ';', [], function(err, res) {
        if (err) throw err;
        client.end(function(err) {
          if (err) throw err;
          groups = res.rows;
          resolve(groups);
        });
      });
    });
  });
}

/* Clean up poll variables for a group */
function cleanUpPoll(group_name) {
  return new Promise(resolve => {
    // Establish client POSTGRESQL
    const client = PostgreSQL.CreateClient();
    client.connect(function(err) {
      if (err) throw err;
      // get all group names in table
      client.query('UPDATE ' + TABLE_NAME + ' SET poll_result=$1, poll_timestamp=$2 WHERE group_name=$3;',
      [{}, null, group_name], function(err, res) {
        if (err) throw err;
        client.end(function(err) {
          if (err) throw err;
          resolve('cleaned poll');
        });
      });
    });
  });
}

// Main function
function main() {
  getAllGroupNames()
    .then(function(groups) {
      groups.forEach( async (group) => {
        timestamp = await CommonService.GetPollTimestamp(group.name);
        var time_passed = Date.now() - timestamp;
        if (time_passed > 1000 * 60) {
          await cleanUpPoll(group.name);
        }
      });
    })
    .catch(function(error) {
      deferred.reject(error);
    });
}

main();
