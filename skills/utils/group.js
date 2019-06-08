// Lunch Group Services
const Q = require('q');
const PostgreSQL = require('./postgres');
var CiscoSpark = require('node-ciscospark');
var spark = new CiscoSpark(process.env.SPARK_TOKEN);

var service = {};

service.CreateGroup = CreateGroup;
service.NotifyGroupJoin = NotifyGroupJoin;

module.exports = service;

/* Function validates group command */
function validateInput(query) {
  var response = {};
  var input_arr = query.trim().replace(/[^\x00-\x7F]/g, "").split(' ');
  // Cases
  if (input_arr.length < 3) {
    response.valid = false;
    response.message = 'Usage: group [ group_name cec1 cec2 ]. E.g. group hogwarts hpotter rweasley. Two or more CECs required.';
  } else {
    var group_name = input_arr[0];
    var cecs = input_arr.slice(1, input_arr.length);
    response.valid = true;
    response.group_name = group_name;
    response.group_members = cecs;
  }
  return response;
}

/* Helper function to format group members from array to JSON entries in PostgreSQL */
function formatMembers(members) {
  var json_members = {
    members: []
  };
  for (var idx = 0; idx < members.length; idx++) {
    var member = {
      cec: members[idx],
      status: 'pending'
    };
    json_members.members.push(member);
  }
  return json_members;
}

/* Function notifies group members of lunch group */
function NotifyGroupJoin(group_name) {
  var deferred = Q.defer();
  deferred.resolve('Lunch group ' + group_name + ' created. Group members are being notified.');
  return deferred.promise;
}

/* Function creates lunch group */
function CreateGroup(query) {
  var deferred = Q.defer();
  // Validate query
  var validity_resp = validateInput(query);

  if (validity_resp.valid) {
    const group_name = validity_resp.group_name;
    const group_members = formatMembers(validity_resp.group_members);

    // Establish client POSTGRESQL
    const client = PostgreSQL.CreateClient();

    client.connect(function(err) {
      if (err) throw err;
      // create lunch group entry if group name is unique
      client.query('SELECT * FROM "lunchGroups" WHERE name = $1', [group_name], function(err, res) {
        if (err) throw err;
        if (res.rows.length == 0) {
          client.query('INSERT INTO "lunchGroups" VALUES ($1, $2);', [group_name, group_members], function(err) {
            if (err) throw err;
            client.end(function(err) {
              if (err) throw err;
              deferred.resolve(group_name);
            });
          });
        } else {
          client.end(function(err) {
            if (err) throw err;
            deferred.reject('Lunch group: ' + group_name + ', already exists. Please select another name.');
          });
        }
      });
    });
  } else {
    deferred.reject(validity_resp.message);
  }
  return deferred.promise;
}
