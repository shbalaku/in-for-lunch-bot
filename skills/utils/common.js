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
service.GetPollTimestamp = GetPollTimestamp;
service.IsItAfter2PM = IsItAfter2PM;
service.PollMember = PollMember;

module.exports = service;

/* ENVIRONMENT VARIABLES */
const TABLE_NAME = process.env.TABLE_NAME;
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN;

/* Helper function to set poll started flag forlunch group for locking polls */
function setPollInProgress(member_id, group_name, flag) {
  return new Promise(resolve => {
    // Establish client POSTGRESQL
    const client = PostgreSQL.CreateClient();
    client.connect(function(err) {
      if (err) throw err;
      // update poll result columns in table
      client.query('UPDATE ' + TABLE_NAME + ' SET poll_in_progress=$1 WHERE group_name=$2 AND person_id=$3;',
        [flag, group_name, member_id],
        function(err, res) {
          if (err) throw err;
          client.end(function(err) {
            if (err) throw err;
            resolve('poll in progress flag set');
          });
        });
    });
  });
}

/* Helper function to save poll result to PostgreSQL */
function savePollResult(result, member_id, group_name) {
  return new Promise(async (resolve) => {
    await setPollInProgress(member_id, group_name, false);
    // Establish client POSTGRESQL
    const client = PostgreSQL.CreateClient();
    client.connect(function(err) {
      if (err) throw err;
      // update poll result columns in table
      client.query('UPDATE ' + TABLE_NAME + ' SET poll_result[1]=$1 WHERE person_id=$2 AND group_name=$3;',
        [result, member_id, group_name],
        function(err, res) {
          if (err) throw err;
          client.end(async function(err) {
            if (err) throw err;
            resolve('saved');
          });
        });
    });
  });
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
      [id],
      function(err, res) {
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
    client.query('SELECT person_id AS id, person_name AS name FROM ' + TABLE_NAME + ' WHERE group_name=$1;',
      [group_name],
      function(err, res) {
        if (err) throw err;
        client.end(function(err) {
          if (err) throw err;
          var members = res.rows;
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
    client.query('SELECT * FROM ' + TABLE_NAME + ' WHERE group_name=$1 AND person_id=$2;',
    [group_name, user_id], function(err, res) {
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

/* Helper function to get poll timestamp for a group */
function GetPollTimestamp(group_name) {
  return new Promise(resolve => {
    // Establish client POSTGRESQL
    const client = PostgreSQL.CreateClient();
    client.connect(function(err) {
      if (err) throw err;
      // get pollers who are in progress
      client.query('SELECT DISTINCT poll_timestamp AS timestamp FROM ' + TABLE_NAME + ' WHERE group_name=$1 AND poll_timestamp IS NOT NULL;',
        [group_name],
        function(err, res) {
          if (err) throw err;
          client.end(function(err) {
            if (err) throw err;
            if (res.rows.length != 0) {
              resolve(parseInt(res.rows[0].timestamp));
            } else {
              resolve(-1);
            }
          });
        });
    });
  });
}

/* Helper function to check if it is after 1 pm */
function IsItAfter2PM() {
  var now = new Date();
  var hour = now.getUTCHours();
  if (hour >= 14) {
    return true;
  }
  return false;
}

/* Helper function to poll member */
async function PollMember(requestor_name, member_name, member_id, group_name, bot) {
  // Set poll in progress flag for member of group
  await setPollInProgress(member_id, group_name, true);
  // Control flow for time of day
  var question_day = '';
  IsItAfter2PM() ? question_day = 'tomorrow' : question_day = 'today';
  // Start Conversation with Poll Questions
  bot.startPrivateConversationWithPersonId(member_id, function(err, convo) {
    if (err) throw err;

    // Initialise poll result object
    var result = {
      in_the_office: false,
      in_for_lunch: false,
      comments: ''
    };

    // Initial message
    if (member_name != requestor_name) {
      convo.sayFirst(requestor_name + ' started a poll for the ' + group_name + ' lunch group!');
    }

    // In The Office Conversation thread - survey presence in office
    convo.addQuestion('Are you in the office ' + question_day + '? Reply with YES or NO.', [{
        pattern: bot.utterances.yes,
        callback: function(response, convo) {
          result.in_the_office = true;
          convo.gotoThread('in_for_lunch');
          convo.next();
        }
      },
      {
        pattern: bot.utterances.no,
        callback: function(response, convo) {
          result.in_the_office = false;
          convo.gotoThread('comments');
          convo.next();
        }
      },
      {
        default: true,
        callback: function(response, convo) {
          // just repeat the question
          convo.gotoThread('default');
          convo.next();
        }
      }
    ], {}, 'default');

    // In For Lunch Conversation thread - survey lunch availability
    convo.addQuestion('Are you available for lunch ' + question_day + '? Reply with YES or NO.', [{
        pattern: bot.utterances.yes,
        callback: function(response, convo) {
          result.in_for_lunch = true;
          convo.gotoThread('comments');
          convo.next();
        }
      },
      {
        pattern: bot.utterances.no,
        callback: function(response, convo) {
          result.in_for_lunch = false;
          convo.gotoThread('comments');
          convo.next();
        }
      },
      {
        default: true,
        callback: function(response, convo) {
          // just repeat the question
          convo.gotoThread('in_for_lunch');
          convo.next();
        }
      }
    ], {}, 'in_for_lunch');

    // Comments Conversation Thread for leaving additional messages
    convo.addQuestion('If you wish to leave a message, please type it here (80 character limit). Otherwise say NO.', [{
        pattern: bot.utterances.no,
        callback: async function(response, convo) {
          await savePollResult(result, member_id, group_name);
          convo.say('Thank you for your response! Poll has ended.');
          convo.next('stop');
        }
      },
      {
        default: true,
        callback: async function(response, convo) {
          // if exceeds char limit just repeat the question
          if (response.text.length > 80) {
            convo.gotoThread('comments');
            convo.next();
          } else {
            result.comments = response.text;
            await savePollResult(result, member_id, group_name);
            convo.say('Thank you for your response! Poll has ended.');
            convo.next('stop');
          }
        }
      }
    ], {}, 'comments');
  });
}
