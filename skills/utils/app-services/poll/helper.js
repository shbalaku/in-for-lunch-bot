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

/* Helper function to poll member */
async function PollMember(requestor_name, member_cec, group_name, bot) {
  // Get member details
  var member_details = await CommonService.GetPersonByCEC(member_cec);
  var member = member_details.items[0];

  // Start Conversation with Poll Questions
  bot.startPrivateConversationWithPersonId(member.id, function(err, convo) {
    if (err) throw err;

    // Initial message
    if (member.firstName != requestor_name) {
      convo.sayFirst(requestor_name + ' started a poll for the ' + group_name + ' lunch group!');
    }

    // In The Office Conversation thread
    convo.addQuestion('Are you in the office today? YES or NO.',[
      {
        pattern: bot.utterances.yes,
        callback: function(response,convo) {
          // go to thread: In For Lunch
          console.log(member.firstName + ' is in the office today.');
          convo.gotoThread('in_for_lunch');
          convo.next();
        }
      },
      {
        pattern: bot.utterances.no,
        callback: function(response,convo) {
          console.log(member.firstName + ' is NOT in the office today.');
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

    // In For Lunch Conversation thread
    convo.addQuestion('Are you available for lunch? Say YES or NO.',[
      {
        pattern: bot.utterances.yes,
        callback: function(response,convo) {
          console.log(member.firstName + ' is available for lunch today.');
          convo.gotoThread('comments');
          convo.next();
        }
      },
      {
        pattern: bot.utterances.no,
        callback: function(response,convo) {
          console.log(member.firstName + ' is NOT available for lunch today.');
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

    // In The Office Conversation Thread for OTHER responses
    convo.addQuestion('If you wish to leave a message, please type it here. Otherwise say NO.', [
      {
        pattern: bot.utterances.no,
        callback: function(response,convo) {
          console.log(member.firstName + ' did not leave a comment.');
          convo.say('Poll ended.');
          convo.next('stop');
        }
      },
      {
        default: true,
        callback: function(response,convo) {
          // just repeat the question
          console.log(member.firstName + ' left a comment: ' + response.text);
          convo.say('Thank you for your response! Poll has ended.');
          convo.next('stop');
        }
      }
    ],{},'comments');

    // Poll Timeout
    // convo.setTimeout(20000);
    // convo.onTimeout(function(convo) {
    //   convo.say('Too slow! Poll timed out.');
    //   convo.next();
    // });
  });
}

/* Helper function to sanitise input and check if user is member of group they are polling */
function ValidateInput(request, requestor_cec) {
  var deferred = Q.defer();
  var group_name = request.trim().replace(/[^\x00-\x7F]/g, "");
  CommonService.GetGroup(group_name)
    .then(function(group) {
      validateRequestor(requestor_cec, group)
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
  return deferred.promise;
}
