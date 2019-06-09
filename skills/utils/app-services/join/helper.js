// Helper Functions for Join Lunch Group Services
const Q = require('q');
const CiscoSpark = require('node-ciscospark');
const spark = new CiscoSpark(process.env.SPARK_TOKEN);

/* LOAD CLIENTS/MODULES */
const PostgreSQL = require('./../../postgres');

var service = {};

service.ValidateInput = ValidateInput;

module.exports = service;

/* ENVIRONMENT VARIABLES */
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN;

/* Helper function to retrieve group entry from lunch_groups table */
function getGroup(name) {
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
          deferred.reject(group_name + ' does not exist or you have not been invited to join.');
        });
      }
    });
  });

  return deferred.promise;
}

/* Helper function to get index of member in members array in lunch_groups table */
function getUserIndex(cec, group_name) {
  var deferred = Q.defer();
  // Establish client POSTGRESQL
  const client = PostgreSQL.CreateClient();
  client.connect(function(err) {
    if (err) throw err;
    // select lunch group entry with group name
    client.query('SELECT * FROM lunch_groups WHERE name = $1', [group_name], function(err, res) {
      if (err) throw err;
      var group_members = res.rows[0].members;
      var indexArr = group_members.reduce(function(acc, member, idx) {
        if (member.cec == cec) acc.push(idx);
        return acc;
      }, []);
      client.end(function(err) {
        if (err) throw err;
        deferred.resolve(indexArr[0]+1);
      });
    });
  });
  return deferred.promise;
}

/* Helper function to add validated user to group */
async function addUserToGroup(cec, group_name) {
  var deferred = Q.defer();
  const updated_user_obj = {
    cec: cec,
    status: 'accepted',
    admin: 'false' // admin users are automatically accepted. can assume user joining is non-admin
  };
  var index = await getUserIndex(cec, group_name);
  // Establish client POSTGRESQL
  const client = PostgreSQL.CreateClient();
  client.connect(function(err) {
    if (err) throw err;
    // select lunch group entry with group name
    client.query('UPDATE lunch_groups SET members[$1]=$2 WHERE name = $3', [index, updated_user_obj, group_name], function(err, res) {
      if (err) {
        client.end(function(e) {
          deferred.reject('Something went wrong. Please try again.');
        });
      }
      client.end(function(err) {
        if (err) throw err;
        deferred.resolve('You have been successfully added to the ' + group_name + ' lunch group!');
      });
    });
  });
  return deferred.promise;
}

/* Helper function to check if requestor has been invited and status is pending */
function validateRequestor(requestor_cec, group) {
  var deferred = Q.defer();
  var pending_requestor = group.members.filter(member => (member.cec == requestor_cec && member.status == 'pending'));
  var accepted_requestor = group.members.filter(member => (member.cec == requestor_cec && member.status == 'accepted'));
  if (pending_requestor.length != 0) {
    addUserToGroup(requestor_cec, group.name)
      .then(function(msg) {
        deferred.resolve(msg);
      })
      .catch(function(error) {
        deferred.reject(error);
      });
  } else if (accepted_requestor.length != 0) {
    deferred.reject('You have already joined the ' + group.name + ' lunch group.');
  } else {
    deferred.reject(group.name + ' does not exist or you have not been invited to join.');
  }
  return deferred.promise;
}

/* Helper function to sanitise input and check if user has been invited to group */
async function ValidateInput(request, requestor_cec) {
  var deferred = Q.defer();
  var group_name = request.trim().replace(/[^\x00-\x7F]/g, "");
  getGroup(group_name)
    .then(function(group) {
      validateRequestor(requestor_cec, group)
        .then(function(resp) {
          deferred.resolve(resp);
        })
        .catch(function(error) {
          deferred.reject(error);
        });
    })
    .catch(function(error) {
      deferred.reject(error);
    });

  return deferred.promise;
}
