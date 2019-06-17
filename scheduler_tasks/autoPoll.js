// Automatically send polls to group members at a specific schedule
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

/**/
function pollGroup(group_name, bot) {
  return new Promise(resolve => {
    var requestor_name = 'AutoPoller';
    CommonService.GetMembersByGroupName(group_name)
      .then(function(members) {
        members.forEach((member) => {
          CommonService.PollMember(requestor_name, member.name, member.id, group_name, bot);
        });
        resolve('Poll started');
      })
      .catch(function(error) {
        resolve(error);
      });
  });
}

// Main function
async function Main(controller) {
  var bot = controller.spawn({});
  var groups = await getAllGroupNames();
  groups.forEach(async (group) => {
    if (group.name == 'TEST') {
      await pollGroup(group.name, bot);
    }
  });
}

Main(controller);

module.exports = Main;
