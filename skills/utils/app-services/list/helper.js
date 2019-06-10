// Helper Functions for List Lunch Group Services
const Q = require('q');
const CiscoSpark = require('node-ciscospark');
const spark = new CiscoSpark(process.env.SPARK_TOKEN);

/* LOAD CLIENTS/MODULES */
const PostgreSQL = require('./../../postgres');

var service = {};

service.GetGroupsByCEC = GetGroupsByCEC;
service.BuildText = BuildText;

module.exports = service;

/* ENVIRONMENT VARIABLES */
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN;

/* Helper function to put all groups user cec is a part of into array */
function GetGroupsByCEC(cec) {
  var deferred = Q.defer();
  // Establish client POSTGRESQL
  const client = PostgreSQL.CreateClient();
  client.connect(function(err) {
    if (err) throw err;
    // select all groups with member cec
    client.query("SELECT name FROM (SELECT name,unnest(members) FROM lunch_groups) AS unnest WHERE unnest->>'cec'=$1", [cec], function(err, res) {
      if (err) throw err;
      if (res.rows.length != 0) {
        client.end(function(err) {
          if (err) throw err;
          var groups = [];
          for (var idx = 0; idx < res.rows.length; idx++) {
            groups.push(res.rows[idx].name);
          }
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
  for (var idx = 0; idx < groups.length; idx++) {
    text += '- ' + groups[idx] + '\n';
  }
  return text;
}
