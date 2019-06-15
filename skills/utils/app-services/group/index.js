// Create Lunch Group Services
const Q = require('q');
const CiscoSpark = require('node-ciscospark');
const spark = new CiscoSpark(process.env.ACCESS_TOKEN);

/* ENVIRONMENT VARIABLES */
const PATH = process.env.PATH;

/* LOAD CLIENTS/MODULES */
const HelperService = require('./helper');
const CommonService = require(PATH + '/skills/utils/common');

var service = {};

service.CreateGroup = CreateGroup;
service.NotifyGroupJoin = NotifyGroupJoin;
service.SetPrimaryGroup = SetPrimaryGroup;

module.exports = service;

/* Function notifies group members of lunch group */
function NotifyGroupJoin(obj, bot) {
  // Send Invitation to join group to Pending Members
  obj.pending_members.forEach(pending_member => {
    bot.startPrivateConversationWithPersonId(pending_member.id, function(err, convo) {
      if (err) throw err;
      // Start conversation
      convo.sayFirst(obj.admin_name + ' has invited you to join the ' + obj.group_name + ' lunch group!');
      convo.addQuestion('To accept/decline, please reply yes or no.',[
        {
          pattern: bot.utterances.yes,
          callback: function(response,convo) {
            HelperService.AddPersonToGroup(pending_member, obj.group_name)
              .then(function(msg) {
                convo.say(msg);
                convo.next('stop');
              })
              .catch(function(error) {
                convo.setVar('error', error);
                convo.gotoThread('error');
                convo.next(error);
              });
          }
        },
        {
          pattern: bot.utterances.no,
          callback: function(response,convo) {
            HelperService.RemovePersonFromGroup(pending_member, obj.group_name)
              .then(function(msg) {
                convo.say(msg);
                convo.next('stop');
              })
              .catch(function(error) {
                convo.setVar('error', error);
                convo.gotoThread('error');
                convo.next(error);
              });
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
      // Error thread
      convo.addMessage({text: 'Oh no I had an error! {{vars.error}}'},'error');
    });
  });
}

/* Function creates lunch group */
function CreateGroup(query) {
  var deferred = Q.defer();
  // Initialise response object
  var response = {
    pending_members: []
  };
  var input = query.match[1];
  var admin_id = query.data.personId;
  // Validate query
  HelperService.ValidateInputSyntax(input)
    .then(function(res) {
      var group_name = res.group_name;
      HelperService.ValidateCECs(res.cecs, admin_id)
        .then(function(group_members) {
          HelperService.ValidateGroup(group_name)
            .then(function() {
              // Valudation complete
              var members_total = group_members.length;
              // Build response object
              response.group_name = group_name;
              response.admin_name = group_members[members_total-1].name;
              response.pending_members = group_members.filter(member => member.status == 'pending');
              // Add verified table column entries
              group_members.forEach( async (member) => {
                await HelperService.AddTableEntry(member, group_name);
              });
              deferred.resolve(response);
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

/* Function to set user's preferred lunch group */
function SetPrimaryGroup(query) {
  var deferred = Q.defer();
  // Process input
  var input = query.match[1];
  var user_id = query.data.personId;
  // Validate command syntax
  validateSyntax(input)
    .then(function(group_name) {
      // Validate group
      CommonService.ValidateGroup(group_name)
        .then(function() {
          CommonService.ValidatePersonInGroup(user_id, group_name)
            .then(async function() {
              // Validation complete
              await HelperService.SetPrimaryGroupForPerson(group_name, user_id);
              deferred.resolve('Success! Your preferences have been updated.');
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
    
  // Helper function to validate syntax of command
  validateSyntax(input){
    var _deferred = Q.defer();
    var group_name = input.trim().replace(/[^\x00-\x7F]/g, "").toUpperCase();
    if (group_name.length == 0) {
      _deferred.reject('Usage: set-default <group_name>');
    } else {
      _deferred.resolve(group_name);
    }
    return _deferred.promise;
  }
  return deferred.promise;
}
