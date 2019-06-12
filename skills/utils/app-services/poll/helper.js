// Helper Functions for Poll Lunch Group Services
const Q = require('q');

/* LOAD CLIENTS/MODULES */
const PostgreSQL = require('./../../postgres');
const CommonService = require('./../../common');

var service = {};

service.ValidateInput = ValidateInput;
service.PollMember = PollMember;

module.exports = service;

/* Helper functioon to validate poll requestor (check they are member of group) */
function validateRequestor(requestor_cec, group) {
  var deferred = Q.defer();
  var pending = group.members.filter(member => (member.cec == requestor_cec && member.status == 'pending'));
  var accepted = group.members.filter(member => (member.cec == requestor_cec && member.status == 'accepted'));
  if (pending.length == 1) {
    deferred.reject('To start a poll, first join your lunch group with command: `join ' + group.name + '`.');
  } else if (accepted.length == 1) {
    deferred.resolve(true);
  } else {
    deferred.reject(group.name + ' does not exist or you have not been invited to join.')
  }
  return deferred.promise;
}

/* Helper function to clear poll column for a group */
function clearPoll(group_name) {
  return new Promise(resolve => {
    // Establish client POSTGRESQL
    const client = PostgreSQL.CreateClient();
    client.connect(function(err) {
      if (err) throw err;
      // select lunch group entry with group name
      client.query('UPDATE lunch_groups SET poll=$1', [null], function(err, res) {
        if (err) throw err;
        client.end(function(err) {
          if (err) throw err;
          resolve('cleared');
        });
      });
    });
  });
}

/* Helper function to check if any polls are in progress in group */
async function validatePoll(group) {
  var deferred = Q.defer();
  // Check if everyone in the group has joined before poll starts
  var pending = group.members.filter(member => member.status == 'pending');
  if (pending.length > 0) {
    deferred.reject('Everyone in the group must join before you start a poll.');
  } else {
    // Check on existing polls
    var poll = await CommonService.GetPollByGroup(group.name);
    if (poll == null) {
      deferred.resolve(true);
    } else {
      var group_members_total = group.members.length;
      var finished_poll = poll.filter(poll_result => poll_result.finished_poll);
      (finished_poll.length != group_members_total) ? deferred.reject('A poll is currently in progress. ' +
      'You must wait until the poll completes to start a new poll.') : await clearPoll(group.name);
      deferred.resolve(true);
    }
  }
  return deferred.promise;
}

/* Helper function to save poll result to PostgreSQL */
function savePollResult(result, group_name) {
  return new Promise(async resolve => {
    result.finished_poll = true;
    var poll = await CommonService.GetPollByGroup(group_name);
    if (poll == null) poll = [];
    poll.push(result);
    // Establish client POSTGRESQL
    const client = PostgreSQL.CreateClient();
    client.connect(function(err) {
      if (err) throw err;
      // select lunch group entry with group name
      client.query('UPDATE lunch_groups SET poll=$1 WHERE name=$2', [poll, group_name], function(err, res) {
        if (err) throw err;
        client.end(function(err) {
          if (err) throw err;
          resolve('saved');
        });
      });
    });
  });
}

/* Helper function to poll member */
async function PollMember(requestor_name, member_cec, group_name, bot) {
  // Get member details
  var member_details = await CommonService.GetPersonByCEC(member_cec);
  var member = member_details.items[0];

  // Start Conversation with Poll Questions
  bot.startPrivateConversationWithPersonId(member.id, function(err, convo) {
    if (err) throw err;

    // Initialise poll result object
    var result = {
      name: member.firstName,
      cec: member_cec,
      in_the_office: false,
      in_for_lunch: false,
      comments: '',
      finished_poll: false
    };

    // Initial message
    if (member.firstName != requestor_name) {
      convo.sayFirst(requestor_name + ' started a poll for the ' + group_name + ' lunch group!');
    }

    // In The Office Conversation thread - survey presence in office
    convo.addQuestion('Are you in the office today? Reply with YES or NO.',[
      {
        pattern: bot.utterances.yes,
        callback: function(response,convo) {
          result.in_the_office = true;
          convo.gotoThread('in_for_lunch');
          convo.next();
        }
      },
      {
        pattern: bot.utterances.no,
        callback: function(response,convo) {
          result.in_the_office = false;
          convo.gotoThread('comments');
          convo.next();
        }
      },
      {
        default: true,
        callback: function(response,convo) {
          // just repeat the question
          convo.gotoThread('default');
          convo.next();
        }
      }
    ],{},'default');

    // In For Lunch Conversation thread - survey lunch availability
    convo.addQuestion('Are you available for lunch? Reply with YES or NO.',[
      {
        pattern: bot.utterances.yes,
        callback: function(response,convo) {
          result.in_for_lunch = true;
          convo.gotoThread('comments');
          convo.next();
        }
      },
      {
        pattern: bot.utterances.no,
        callback: function(response,convo) {
          result.in_for_lunch = false;
          convo.gotoThread('comments');
          convo.next();
        }
      },
      {
        default: true,
        callback: function(response,convo) {
          // just repeat the question
          convo.gotoThread('in_for_lunch');
          convo.next();
        }
      }
    ],{},'in_for_lunch');

    // Comments Conversation Thread for leaving additional messages
    convo.addQuestion('If you wish to leave a message, please type it here. Otherwise say NO.', [
      {
        pattern: bot.utterances.no,
        callback: async function(response,convo) {
          await savePollResult(result, group_name);
          convo.say('Poll ended.');
          convo.next('stop');
        }
      },
      {
        default: true,
        callback: async function(response,convo) {
          // just repeat the question
          result.comments = response.text;
          await savePollResult(result, group_name);
          convo.say('Thank you for your response! Poll has ended.');
          convo.next('stop');
        }
      }
    ],{},'comments');
  });
}

/* Helper function to sanitise input and check if user is member of group they are polling */
function ValidateInput(input, requestor_cec) {
  var deferred = Q.defer();
  var group_name = input.trim().replace(/[^\x00-\x7F]/g, "");
  CommonService.GetGroup(group_name)
    .then(function(group) {
      validateRequestor(requestor_cec, group)
        .then(function() {
          validatePoll(group)
            .then(function() {
              // Validation complete
              deferred.resolve(group);
            })
            .catch(function(error) {
              deferred.reject(error);
            });
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
