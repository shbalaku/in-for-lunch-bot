// Common Functions for App Services
const Q = require('q');
const CiscoSpark = require('node-ciscospark');
const spark = new CiscoSpark(process.env.ACCESS_TOKEN);

/* LOAD CLIENTS/MODULES */
const PostgreSQL = require('./postgres');

var service = {};

service.GetGroup = GetGroup;
service.GetPersonByCEC = GetPersonByCEC;

module.exports = service;

/* ENVIRONMENT VARIABLES */
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN;

/* Helper function to retrieve group entry from lunch_groups table */
function GetGroup(name) {
  var deferred = Q.defer();
  var group = {};
  // Establish client POSTGRESQL
  const client = PostgreSQL.CreateClient();
  client.connect(function(err) {
    if (err) throw err;
    // select lunch group entry with group name
    client.query('SELECT * FROM lunch_groups WHERE name = $1', [name], function(err, res) {
      if (err) throw err;
      if (res.rows.length != 0) {
        client.end(function(err) {
          if (err) throw err;
          group.name = name;
          group.members = res.rows[0].members;
          deferred.resolve(group);
        });
      } else {
        client.end(function(err) {
          if (err) throw err;
          deferred.reject(name + ' does not exist or you have not been invited to join.');
        });
      }
    });
  });
  return deferred.promise;
}

/* Helper function to get person details by CEC */
function GetPersonByCEC(cec) {
  return new Promise(resolve => {
    var personEmail = cec + EMAIL_DOMAIN;
    spark.people.list(personEmail, function(err, res) {
      if (err) throw err;
      resolve(JSON.parse(res));
    });
  });
}
