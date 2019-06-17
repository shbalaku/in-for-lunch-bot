// Helper Functions for Poll Lunch Group Services
const Q = require('q');

/* ENVIRONMENT VARIABLES */
const PATH = process.env.PATH;
const TABLE_NAME = process.env.TABLE_NAME;

// CONSTANTS
const POLL_HOLD_INTERVAL = 1000 * 60 * 60 * 12;

/* LOAD CLIENTS/MODULES */
const PostgreSQL = require(PATH + '/skills/utils/postgres');
const CommonService = require(PATH + '/skills/utils/common');

var service = {};

service.ValidatePollInput = ValidatePollInput;
service.MembersHaveJoined = MembersHaveJoined;
service.ValidatePoll = ValidatePoll;
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

/* Helper function to check if any polls are in progress in group */
async function ValidatePoll(group_name) {
  var deferred = Q.defer();
  var timestamp = await CommonService.GetPollTimestamp(group_name);
  if (timestamp != -1) {
    var time_passed = Date.now() - timestamp;
    // Check if time passed is greater than hold time
    if (time_passed > POLL_HOLD_INTERVAL) {
      await setPollTimestamp(group_name);
      deferred.resolve('poll request valid');
    } else {
      var d = new Date(timestamp + POLL_HOLD_INTERVAL);
      d.setTime( d.getTime() - new Date().getTimezoneOffset()*60*1000 );
      var error = '\u274c Poll request denied. You must wait until the hold ' +
        'time expires \u23f3 \n\nHold time expires on: **' + d.toUTCString() + '**';
      deferred.reject(error);
    }
  } else {
    await setPollTimestamp(group_name);
    deferred.resolve('poll request valid');
  }
  return deferred.promise;
}

/* Helper function to check whether all members have joined before starting a poll */
function MembersHaveJoined(group_name) {
  var deferred = Q.defer();
  // Establish client POSTGRESQL
  const client = PostgreSQL.CreateClient();
  client.connect(function(err) {
    if (err) throw err;
    // select persons as member of group and their member status
    client.query('SELECT status FROM ' + TABLE_NAME + ' WHERE group_name=$1 AND status=$2;',
      [group_name, 'pending'],
      function(err, res) {
        if (err) throw err;
        client.end(function(err) {
          if (err) throw err;
          if (res.rows.length > 0) {
            deferred.reject('Everyone in the group must join before starting a poll.');
          } else {
            deferred.resolve('everyone has joined the group');
          }
        });
      });
  });
  return deferred.promise;
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
    client.query('SELECT person_name AS name, poll_result AS result FROM ' + TABLE_NAME + ' WHERE group_name=$1 AND person_id!=$2 AND poll_result IS NOT NULL;',
      [group_name, user_id],
      function(err, res) {
        if (err) throw err;
        client.end(function(err) {
          if (err) throw err;
          if (res.rows.length != 0) {
            var obj = res.rows;
            deferred.resolve(obj);
          } else {
            var err = 'No poll results to display right now.';
            deferred.reject(err);
          }
        });
      });
  });
  return deferred.promise;
}

/* Helper service to write text string of poll results displayed back to user */
async function BuildResultsText(results_obj, group_name) {
  // Initialisation
  var text = '';
  var question_day = '';

  // Determine which day is in question for the poll
  CommonService.IsItAfter2PM() ? question_day = 'tomorrow' : question_day = 'today';

  // Filtered results arrays
  console.log(results_obj);
  const in_for_lunch_arr = results_obj.filter(obj => obj.result.in_for_lunch);
  const in_the_office_arr = results_obj.filter(obj => (obj.result[0].in_the_office && !obj.result[0].in_for_lunch));
  const out_of_office_arr = results_obj.filter(obj => !obj.result[0].in_the_office);
  const comments_arr = results_obj.filter(obj => obj.result[0].comments.length != 0);

  // Booleans
  const noone_is_in = results_obj.length == out_of_office_arr.length;
  const everyone_is_in = results_obj.length == in_for_lunch_arr.length;

  // Noone being in statements
  if (noone_is_in) {
    text += '\nNo-one is in the office today ' + question_day + ' \u{1f63f}\n';
  }
  // Everyone being in statements
  if (everyone_is_in) {
    text += '\nEveryone is free for lunch ' + question_day + '!\u{1f603}\n';
  } else if (out_of_office_arr.length == 0) {
    text += '\nEveryone is in the office ' + question_day + '! \u{1f4aa}\n';
  }
  console.log(in_for_lunch_arr);
  console.log(everyone_is_in);
  // In for lunch section
  if (in_for_lunch_arr.length != 0 && !everyone_is_in) {
    text += '\n\u{1f37d} In For Lunch:\n';
    in_for_lunch_arr.forEach(obj => {
      text += '- ' + obj.name + '\n';
    });
  }
  // In the office but not in for lunch section
  if (in_the_office_arr.length != 0 && !noone_is_in) {
    text += '\n\u{1f3e2} In The Office But Not Free For Lunch:\n';
    in_the_office_arr.forEach(obj => {
      text += '- ' + obj.name + '\n';
    });
  }
  // Out of office section
  if (out_of_office_arr.length != 0 && !noone_is_in) {
    text += '\n\u{1f3d6} Out Of Office:\n';
    out_of_office_arr.forEach(obj => {
      text += '- ' + obj.name + '\n';
    });
  }
  // Comments section
  if (comments_arr.length != 0) {
    text += '\n\u{1f4ac} Comments:\n';
    comments_arr.forEach(obj => {
      text += '- ' + obj.name + ' says: ' + obj.result[0].comments + '\n';
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
    text += '\nEveryone has completed the poll for ' + question_day + ' \u{1f4af}\n';
  }
  // Display poll timestamp
  timestamp = await CommonService.GetPollTimestamp(group_name);
  var d = new Date(timestamp);
  d.setTime( d.getTime() - new Date().getTimezoneOffset()*60*1000 );
  text += '\nPoll recorded on **' + d.toUTCString() + '** \u231b\n';

  return text;
}
