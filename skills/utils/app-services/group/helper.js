// Helper Functions for Create Lunch Group Services
const Q = require('q');

/* ENVIRONMENT VARIABLES */
const PATH = process.env.PATH;
const TABLE_NAME = process.env.TABLE_NAME;

/* LOAD CLIENTS/MODULES */
const PostgreSQL = require(PATH + '/skills/utils/postgres');
const CommonService = require(PATH + '/skills/utils/common');

var service = {};

service.ValidateInputSyntax = ValidateInputSyntax;
service.ValidateCECs = ValidateCECs;
service.ValidateGroup = ValidateGroup;
service.AddTableEntry = AddTableEntry;
service.AddPersonToGroup = AddPersonToGroup;
service.RemovePersonFromGroup = RemovePersonFromGroup;
service.SetPrimaryGroupForPerson = SetPrimaryGroupForPerson;

module.exports = service;

/* Helper function to validate input syntax */
function ValidateInputSyntax(input) {
  var deferred = Q.defer();
  var resp = {};
  //trim and remove non-ASCII text and excess whitespace
  var inputFormat = input.trim().replace(/[^\x00-\x7F]/g,"").replace(/\s+/g," ");
  //check input includes "-name" and "-add"
  var splitInputArr = inputFormat.split(" ");
  if (splitInputArr.includes('-name') && splitInputArr.includes('-add')) {
    // Get indices of flags in splitInput array
    var nameFlagIdx = splitInputArr.lastIndexOf('-name');
    var addFlagIdx = splitInputArr.lastIndexOf('-add');
    // Validate flags are in right order
    if (nameFlagIdx > addFlagIdx) {
      // ERROR: INVALID INPUT FORMAT
      deferred.reject(syntaxError());
    }
    // Get group name and cec values
    var groupArr = splitInputArr.slice(nameFlagIdx + 1, addFlagIdx);
    var cecArr = splitInputArr.slice(addFlagIdx + 1, splitInputArr.length);
    //check a group name is given
    if (groupArr.length > 0 && cecArr.length > -1) { //testing value = -1 prod value = 0
      resp.group_name = groupArr.join(" ").toUpperCase();
      resp.cecs = cecArr;
      deferred.resolve(resp);
    } else {
      // ERROR: INVALID INPUT FORMAT
      deferred.reject(syntaxError());
    }
  } else {
    // ERROR: INVALID INPUT FORMAT
    deferred.reject(syntaxError());
  }
  /* Syntax error */
  function syntaxError() {
    var err = 'Usage: `group -name <group_name> -add <cec1> [ <cec2> ... ]`.' +
    ' E.g. `group -name hogwarts -add hpotter rweasley`. One or more CECs required (excluding your own).';
    return err;
  }
  return deferred.promise;
}

/* Helper function to validate input CECs against Spark API */
async function ValidateCECs(cecs, admin_id) {
  var deferred = Q.defer();
  var valid_members = [];
  let unique_cecs = [...new Set(cecs)];
  for (var idx = 0; idx < unique_cecs.length; idx++) {
    var res = await CommonService.GetPersonByCEC(unique_cecs[idx]);
    if (res.items.length != 0) {
      if (res.items[0].id != admin_id) {
        var person = {
          id: res.items[0].id,
          name: res.items[0].firstName,
          status: 'pending',
          admin: false
        };
        valid_members.push(person);
      }
    }
  }
  // Add admin to valid members
  var admin_person_name = await CommonService.GetPersonById(admin_id);
  var admin = {
    id: admin_id,
    name: admin_person_name,
    status: 'accepted', //testing value = pending, prod value = accepted
    admin: true
  };
  valid_members.push(admin);
  // Validation
  if (valid_members.length < 1) { // testing value = 1, prod value = 2
    var err = '\u274c One or more valid CECs are required (excluding your own). Please check your inputs and try again.';
    deferred.reject(err);
  } else {
    deferred.resolve(valid_members);
  }
  return deferred.promise;
}

/* Helper function to validate uniqueness of group name */
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
        if (res.rows.length == 0) {
          deferred.resolve();
        } else {
          deferred.reject('Lunch group: "' + group_name + '" already exists \u{1f62c} Please select another name.');
        }
      });
    });
  });
  return deferred.promise;
}

/* Helper function to add member information to table */
function AddTableEntry(member, group_name) {
  return new Promise(resolve => {
    // Establish client POSTGRESQL
    const client = PostgreSQL.CreateClient();
    client.connect(function(err) {
      if (err) throw err;
      // insert lunch group table entry
      client.query('INSERT INTO ' + TABLE_NAME + ' (person_id, person_name, group_name, admin, status, poll_in_progress) VALUES ($1, $2, $3, $4, $5, $6);',
        [member.id, member.name, group_name, member.admin, member.status, false],
        function(err) {
          if (err) throw err;
          client.end(function(err) {
            if (err) throw err;
            resolve();
          });
        });
    });
  });
}

/* Helper function to remove member information from table */
function RemoveTableEntry(member_id, group_name) {
  return new Promise(resolve => {
    // Establish client POSTGRESQL
    const client = PostgreSQL.CreateClient();
    client.connect(function(err) {
      if (err) throw err;
      // insert lunch group table entry
      client.query('DELETE FROM ' + TABLE_NAME + ' WHERE person_id=$1 AND group_name=$2;', [member_id, group_name], function(err) {
        if (err) throw err;
        client.end(function(err) {
          if (err) throw err;
          resolve();
        });
      });
    });
  });
}

/* Helper function to join a person to a lunch group in Postgres */
function AddPersonToGroup(person, group_name) {
  var deferred = Q.defer();
  // Establish client POSTGRESQL
  const client = PostgreSQL.CreateClient();
  client.connect(function(err) {
    if (err) throw err;
    // check if person exists already
    client.query('SELECT status FROM ' + TABLE_NAME + ' WHERE person_id=$1 AND group_name=$2;', [person.id, group_name], async function(err, res) {
      if (err) throw err;
      if (res.rows.length == 1) {
        var status = res.rows[0].status;
        if (status == 'pending') {
          // Update member's status as accepted
          client.query('UPDATE ' + TABLE_NAME + ' SET status=$1 WHERE person_id=$2 AND group_name=$3;',
            ['accepted', person.id, group_name],
            function(err) {
              if (err) throw err;
              client.end(function(err) {
                var msg = '\u2705 Success! You are now part of the ' + group_name + ' lunch group!';
                deferred.resolve(msg);
              });
            });
        } else {
          var err = 'You have already joined the ' + group_name + ' lunch group.';
          deferred.reject(err);
        }
      } else {
        person.status = 'accepted';
        await AddTableEntry(person, group_name);
        client.end(function(err) {
          if (err) throw err;
          var msg = '\u2705 Success! You are now part of the ' + group_name + ' lunch group!';
          deferred.resolve(msg);
        });
      }
    });
  });
  return deferred.promise;
}

/* Helper function to remove a person from a lunch group in Postgres */
function RemovePersonFromGroup(person, group_name) {
  var deferred = Q.defer();
  // Establish client POSTGRESQL
  const client = PostgreSQL.CreateClient();
  client.connect(function(err) {
    if (err) throw err;
    // check if person exists
    client.query('SELECT * FROM ' + TABLE_NAME + ' WHERE person_id=$1 AND group_name=$2;', [person.id, group_name], async function(err, res) {
      if (err) throw err;
      if (res.rows.length == 1) {
        await RemoveTableEntry(person.id, group_name);
        client.end(function(err) {
          if (err) throw err;
          var msg = 'No worries \u{1f60e} You have been removed from the ' + group_name + ' lunch group.';
          deferred.resolve(msg);
        });
      } else {
        var err = person.name + ' is not part of the ' + group_name + ' lunch group \u{1f914}';
        deferred.reject(err);
      }
    });
  });
  return deferred.promise;
}

/* Helper function to set primary group field in lunch groups table for person */
function SetPrimaryGroupForPerson(group_name, user_id) {
  return new Promise(resolve => {
    // Establish client POSTGRESQL
    const client = PostgreSQL.CreateClient();
    client.connect(function(err) {
      if (err) throw err;
      // update primary group column in table for user_id
      client.query('UPDATE ' + TABLE_NAME + ' SET primary_group=$1 WHERE person_id=$2;',
        [group_name, user_id],
        function(err, res) {
          if (err) throw err;
          client.end(function(err) {
            if (err) throw err;
            resolve('primary group set');
          });
        });
    });
  });
}
