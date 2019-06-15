// Helper Functions for Poll Lunch Group Services
const Q = require('q');

/* ENVIRONMENT VARIABLES */
const PATH = process.env.PATH;
const TABLE_NAME = process.env.TABLE_NAME;

// CONSTANTS
const POLL_HOLD_INTERVAL = 1000 * 60 * 60 * 8;

/* LOAD CLIENTS/MODULES */
const PostgreSQL = require(PATH + '/skills/utils/postgres');
const CommonService = require(PATH + '/skills/utils/common');

var service = {};

service.ValidatePollInput = ValidatePollInput;
service.ValidatePoll = ValidatePoll;
service.PollMember = PollMember;
service.ValidateResultsInput = ValidateResultsInput;
service.GetPollResults = GetPollResults;
service.BuildResultsText = BuildResultsText;

module.exports = service;

/* Helper function to set poll timestamp forlunch group for locking down polls */
function setPollTimestamp(group_name) {
  return new Promise(resolve => {
    // Establish client POSTGRESQL
    const client = PostgreSQL.CreateClient();
    client.connect(function(err) {
      if (err) throw err;
      // update poll result columns in table
      client.query('UPDATE ' + TABLE_NAME + ' SET poll_timestamp=$1 WHERE group_name=$2;',
        [Date.now(), group_name],
        function(err, res) {
          if (err) throw err;
          client.end(function(err) {
            if (err) throw err;
            resolve('poll timestamp set');
          });
        });
    });
  });
}

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
            // var finished = await hasPollFinished(group_name);
            // if (finished) await setPollStartedFlag(group_name, false);
            resolve('saved');
          });
        });
    });
  });
}

/* Helper function to check if any polls are in progress in group */
function ValidatePoll(group_name) {
  var deferred = Q.defer();
  // Establish client POSTGRESQL
  const client = PostgreSQL.CreateClient();
  client.connect(function(err) {
    if (err) throw err;
    // select lunch group entry with user_id and group_name
    client.query('SELECT DISTINCT poll_timestamp FROM ' + TABLE_NAME + ' WHERE group_name=$1 AND poll_timestamp IS NOT NULL;',
      [group_name],
      function(err, res) {
        if (err) throw err;
        client.end(async function(err) {
          if (err) throw err;
          if (res.rows.length == 0) {
            await setPollTimestamp(group_name);
            deferred.resolve('poll request valid');
          } else {
            var timestamp = parseInt(res.rows[0].poll_timestamp);
            var time_passed = Date.now() - timestamp;
            // Check if time passed is greater than hold time
            if (time_passed > POLL_HOLD_INTERVAL) {
              await setPollTimestamp(group_name);
              deferred.resolve('poll request valid');
            } else {
              var hold_exp = new Date(timestamp + POLL_HOLD_INTERVAL);
              var error = '\u274c Poll request denied. You must wait until the hold ' +
                'time expires \u23f3 \n\nHold time expires on: **' + hold_exp.toString() + '**';
              deferred.reject(error);
            }
          }
        });
      });
  });
  return deferred.promise;
}

/* Helper function to sanitise input and check if user is member of group they are polling */
function ValidatePollInput(input, user_id) {
  var deferred = Q.defer();
  var group_name = input.trim().replace(/[^\x00-\x7F]/g, "").toUpperCase();
  if (group_name.length == 0) {
    // set group_name as primary group for user
    CommonService.GetPrimaryGroupById(user_id)
      .then(function(primary_group) {
        deferred.resolve(primary_group);
      })
      .catch(function(error) {
        deferred.reject(error);
      });
  } else {
    // Validate group
    CommonService.ValidateGroup(group_name)
      .then(function() {
        // Validate requestor
        CommonService.ValidatePersonInGroup(user_id, group_name)
          .then(function() {
            deferred.resolve(group_name);
          })
          .catch(function(error) {
            deferred.reject(error);
          });
      })
      .catch(function(error) {
        deferred.reject(error);
      });
  }
  return deferred.promise;
}

/* Helper function to poll member */
async function PollMember(requestor_name, member, group_name, bot) {
  // Set poll in progress flag for member of group
  await setPollInProgress(member.id, group_name, true);
  // Start Conversation with Poll Questions
  bot.startPrivateConversationWithPersonId(member.id, function(err, convo) {
    if (err) throw err;

    // Initialise poll result object
    var result = {
      in_the_office: false,
      in_for_lunch: false,
      comments: ''
    };

    // Initial message
    if (member.name != requestor_name) {
      convo.sayFirst(requestor_name + ' started a poll for the ' + group_name + ' lunch group!');
    }

    // In The Office Conversation thread - survey presence in office
    convo.addQuestion('Are you in the office today? Reply with YES or NO.', [{
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
    convo.addQuestion('Are you available for lunch? Reply with YES or NO.', [{
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
          await savePollResult(result, member.id, group_name);
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
            await savePollResult(result, member.id, group_name);
            convo.say('Thank you for your response! Poll has ended.');
            convo.next('stop');
          }
        }
      }
    ], {}, 'comments');
  });
}

/* Helper function to sanitise input for results command and check if user is member of group */
function ValidateResultsInput(input, user_id) {
  var deferred = Q.defer();
  var group_name = input.trim().replace(/[^\x00-\x7F]/g, "").toUpperCase();
  if (group_name.length == 0) {
    // set group_name as primary group for user
    CommonService.GetPrimaryGroupById(user_id)
      .then(function(primary_group) {
        deferred.resolve(primary_group);
      })
      .catch(function(error) {
        deferred.reject(error);
      });
  } else {
    // Validate group
    CommonService.ValidateGroup(group_name)
      .then(function() {
        // Validate requestor
        CommonService.ValidatePersonInGroup(user_id, group_name)
          .then(function() {
            // Validation complete
            deferred.resolve(group_name);
          })
          .catch(function(error) {
            deferred.reject(error);
          });
      })
      .catch(function(error) {
        deferred.reject(error);
      });
  }
  return deferred.promise;
}

/* Helper function to get poll results for a group */
function GetPollResults(group_name, user_id) {
  var deferred = Q.defer();
  var results = [];
  // Establish client POSTGRESQL
  const client = PostgreSQL.CreateClient();
  client.connect(function(err) {
    if (err) throw err;
    // get poll results by group_name
    client.query('SELECT person_name, poll_result FROM ' + TABLE_NAME + ' WHERE group_name=$1 AND person_id!=$2 AND poll_result IS NOT NULL;',
      [group_name, user_id],
      function(err, res) {
        if (err) throw err;
        client.end(function(err) {
          if (err) throw err;
          if (res.rows.length != 0) {
            var rows = res.rows;
            deferred.resolve(rows);
          } else {
            var err = 'No poll results to display right now.';
            deferred.reject(err);
          }
        });
      });
  });
  return deferred.promise;
}

/* Helper function to get array of pollers in progress for group_name */
function getPollersInProgress(group_name) {
  return new Promise(resolve => {
    var in_progress_pollers = [];
    // Establish client POSTGRESQL
    const client = PostgreSQL.CreateClient();
    client.connect(function(err) {
      if (err) throw err;
      // get pollers who are in progress
      client.query('SELECT person_name FROM ' + TABLE_NAME + ' WHERE group_name=$1 AND poll_in_progress=$2;',
        [group_name, true],
        function(err, res) {
          if (err) throw err;
          client.end(function(err) {
            if (err) throw err;
            res.rows.forEach(row => {
              in_progress_pollers.push(row.person_name);
            });
            resolve(in_progress_pollers);
          });
        });
    });
  });
}

/* Helper service to write text string of poll results displayed back to user */
async function BuildResultsText(results, group_name) {
  var text = '';
  // In for lunch section
  var in_for_lunch_arr = results.filter(result => result.poll_result.in_for_lunch);
  if (in_for_lunch_arr.length != 0) {
    text += '\n\u{1f37d} In For Lunch:\n';
    in_for_lunch_arr.forEach(obj => {
      text += '- ' + obj.person_name + '\n';
    });
  } else {
    text += '\nNo-one is in for lunch today \u{1f648}\n';
  }
  // In the office but not in for lunch section
  var in_the_office_arr = results.filter(result => (result.poll_result.in_the_office && !result.poll_result.in_for_lunch));
  if (in_the_office_arr.length != 0) {
    text += '\n\u{1f3e2} In The Office But Not In For Lunch:\n';
    in_the_office_arr.forEach(obj => {
      text += '- ' + obj.person_name + '\n';
    });
  }
  // Out of office section
  var out_of_office_arr = results.filter(result => !result.poll_result.in_the_office);
  if (results.length == out_of_office_arr.length) {
    text += '\nNo-one is in the office today \u{1f63f}\n';
  } else if (out_of_office_arr.length != 0) {
    text += '\n\u{1f3d6} Out Of Office:\n';
    out_of_office_arr.forEach(obj => {
      text += '- ' + obj.person_name + '\n';
    });
  } else {
    text += '\nEveryone is in the office today! \u{1f4aa}\n';
  }
  // Comments section
  var comments_arr = results.filter(result => result.poll_result.comments.length != 0);
  if (comments_arr.length != 0) {
    text += '\n\u{1f4ac} Comments:\n';
    comments_arr.forEach(obj => {
      text += '- ' + obj.person_name + ' says: ' + obj.poll_result.comments + '\n';
    });
  }
  // Members yet to complete poll section
  var in_progress_pollers = await getPollersInProgress(group_name);
  if (in_progress_pollers.length != 0) {
    text += '\n\u{1f937} Yet to complete poll:\n';
    in_progress_pollers.forEach(poller => {
      text += '- ' + poller + '\n';
    });
  } else {
    text += '\nEveryone has completed the poll today \u{1f4af}\n';
  }
  return text;
}
