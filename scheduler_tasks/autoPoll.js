// Automatically send polls to group members at a specific schedule
const Q = require('q');
const Botkit = require('botkit');

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
async function Main(bot) {
  var groups = await getAllGroupNames();
  groups.forEach(async (group) => {
    if (group.name == 'TEST') {
      await pollGroup(group.name, bot);
    }
  });
}

//
// Create bot
//

// Get public URL where Cisco Webex Teams will post spaces notifications (webhook registration)
var public_url = '';
// Heroku hosting: available if dyno metadata are enabled, https://devcenter.heroku.com/articles/dyno-metadata
if (process.env.HEROKU_APP_NAME) {
  public_url = "https://" + process.env.HEROKU_APP_NAME + ".herokuapp.com";
}

var controller = Botkit.webexbot({
  log: true,
  public_address: public_url,
  access_token: process.env.ACCESS_TOKEN,
  secret: process.env.SECRET, // this is a RECOMMENDED security setting that checks of incoming payloads originate from Cisco Webex Teams
  webhook_name: 'built with Botkit'
});

const bot = controller.spawn({});

Main(bot);
