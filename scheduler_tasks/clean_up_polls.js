// Clean up polls older than half a day
const Q = require('q');

/* ENVIRONMENT VARIABLES */
const TABLE_NAME = process.env.TABLE_NAME;

/* LOAD CLIENTS/MODULES */
const PostgreSQL = require('./../skills/utils/postgres');
const CommonService = require('./../skills/utils/common');

/* CONSTANTS */
const CLEAN_UP_INTERVAL = 1000 * 60 * 60 * 12;

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

// Main function
async function main() {
  var groups = await getAllGroupNames();
  groups.forEach( async (group) => {
    timestamp = await CommonService.GetPollTimestamp(group.name);
    if (timestamp != -1) {
      var time_passed = Date.now() - timestamp;
      if (time_passed >= CLEAN_UP_INTERVAL) {
        await CommonService.CleanUpPoll(group.name);
      }
    }
  });
}

main();
