// Helper Functions for List Lunch Group Services
const Q = require('q');

/* ENVIRONMENT VARIABLES */
const PATH = process.env.PATH;
const TABLE_NAME = process.env.TABLE_NAME;

/* LOAD CLIENTS/MODULES */
const PostgreSQL = require(PATH + '/skills/utils/postgres');

var service = {};

service.GetGroupsByPersonId = GetGroupsByPersonId;
service.BuildText = BuildText;

module.exports = service;

/* Helper function to put all groups user cec is a part of into array */
function GetGroupsByPersonId(id) {
  var deferred = Q.defer();
  // Establish client POSTGRESQL
  const client = PostgreSQL.CreateClient();
  client.connect(function(err) {
    if (err) throw err;
    // select all groups with member cec
    client.query('SELECT group_name, primary_group FROM ' + TABLE_NAME + ' WHERE person_id=$1;', [id], function(err, res) {
      if (err) throw err;
      if (res.rows.length != 0) {
        client.end(function(err) {
          if (err) throw err;
          var groups = {
            list: [],
            primary_group: res.rows[0].primary_group
          };
          res.rows.forEach(row => {
            groups.list.push(row.group_name);
          });
          deferred.resolve(groups);
        });
      } else {
        client.end(function(err) {
          if (err) throw err;
          deferred.reject('You are not part of any lunch group.');
        });
      }
    });
  });
  return deferred.promise;
}

/* Helper service to write text string of groups displayed back to user */
function BuildText(groups) {
  var text = 'Your lunch groups:\n';
  var primary_group = groups.primary_group;
  groups.list.forEach( group => {
    text += '- ' + group;
    if (group == primary_group) {
      text += ' (preferred group)';
    }
    text += '\n';
  });
  return text;
}
