// Common Functions for App Services
const Q = require('q');
const CiscoSpark = require('node-ciscospark');
const spark = new CiscoSpark(process.env.ACCESS_TOKEN);

/* LOAD CLIENTS/MODULES */
const PostgreSQL = require('./postgres');

var service = {};

service.GetPersonByCEC = GetPersonByCEC;
service.GetPersonById = GetPersonById;
service.GetPrimaryGroupById = GetPrimaryGroupById;
service.GetMembersByGroupName = GetMembersByGroupName;
service.ValidateGroup = ValidateGroup;
service.ValidatePersonInGroup = ValidatePersonInGroup;

module.exports = service;

/* ENVIRONMENT VARIABLES */
const TABLE_NAME = process.env.TABLE_NAME;
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN;

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

/* Helper function to retrieve admin of lunch group's details */
function GetPersonById(id) {
  return new Promise(resolve => {
    var details = {};
    spark.people.get(id, function(err, res) {
      if (err) throw err;
      var person = JSON.parse(res);
      resolve(person.firstName);
    });
  });
}

/* Helper function to get user's primary group name */
function GetPrimaryGroupById(id) {
  var deferred = Q.defer();
  // Establish client POSTGRESQL
  const client = PostgreSQL.CreateClient();
  client.connect(function(err) {
    if (err) throw err;
    // select primary group entry based on person ID
    client.query('SELECT DISTINCT primary_group FROM ' + TABLE_NAME + ' WHERE person_id=$1 AND primary_group IS NOT NULL;',
    [id], function(err, res) {
      if (err) throw err;
      client.end(function(err) {
        if (err) throw err;
        if (res.rows.length == 1) {
          var primary_group = res.rows[0].primary_group;
          deferred.resolve(primary_group);
        } else {
          deferred.reject('You need to select your preferred lunch group using commmand: `set-default <group_name>`');
        }
      });
    });
  });
  return deferred.promise;
}

/* Helper function to retrieve member details of a group */
function GetMembersByGroupName(group_name) {
  var deferred = Q.defer();
  // Establish client POSTGRESQL
  const client = PostgreSQL.CreateClient();
  client.connect(function(err) {
    if (err) throw err;
    // select persons as member of group and their member status
    client.query('SELECT person_id, person_name, status FROM ' + TABLE_NAME + ' WHERE group_name=$1;',
    [group_name], function(err, res) {
      if (err) throw err;
      client.end(function(err) {
        if (err) throw err;
        var members = [];
        var rows = res.rows;
        rows.forEach( row => {
          members.push({
            id: row.person_id,
            name: row.person_name
          });
          if (row.status == 'pending') {
            deferred.reject('Everyone in the group must join before you start a poll.');
          }
        });
        deferred.resolve(members);
      });
    });
  });
  return deferred.promise;
}

/* Helper function to validate group in lunch groups table */
function ValidateGroup(group_name) {
  var deferred = Q.defer();
  // Establish client POSTGRESQL
  const client = PostgreSQL.CreateClient();
  client.connect(function(err) {
    if (err) throw err;
    // create lunch group entry if group name is unique
    client.query('SELECT DISTINCT group_name FROM ' + TABLE_NAME + ' WHERE group_name = $1;', [group_name], function(err, res) {
      if (err) throw err;
      client.end(function(err) {
        if (err) throw err;
        if (res.rows.length == 1) {
          deferred.resolve('group exists');
        } else {
          deferred.reject('Lunch group does not exist or you have not been invited to join.');
        }
      });
    });
  });
  return deferred.promise;
}

/* Helper function to validate member belongs to lunch group */
function ValidatePersonInGroup(user_id, group_name) {
  var deferred = Q.defer();
  // Establish client POSTGRESQL
  const client = PostgreSQL.CreateClient();
  client.connect(function(err) {
    if (err) throw err;
    // select lunch group entry with user_id and group_name
    client.query('SELECT * FROM ' + TABLE_NAME + ' WHERE group_name=$1 AND person_id=$2;', [group_name, user_id], function(err, res) {
      if (err) throw err;
      client.end(function(err) {
        if (err) throw err;
        if (res.rows.length == 1) {
          deferred.resolve('person valid in group');
        } else {
          deferred.reject('Lunch group does not exist or you have not been invited to join.');
        }
      });
    });
  });
  return deferred.promise;
}
