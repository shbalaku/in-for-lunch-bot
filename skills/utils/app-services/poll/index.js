// Poll Lunch Group Services
const Q = require('q');

/* ENVIRONMENT VARIABLES */
const PATH = process.env.PATH;

/* LOAD CLIENTS/MODULES */
const HelperService = require('./helper');
const CommonService = require(PATH + '/skills/utils/common');

var service = {};

service.PollGroup = PollGroup;
service.GetPollResults = GetPollResults;

module.exports = service;

/* Function which allows user to poll group */
function PollGroup(bot, message) {
  var deferred = Q.defer();
  var user_id = message.data.personId;
  var input = message.match[1];
  HelperService.ValidatePollInput(input, user_id)
    .then(async function(group_name) {
      var requestor_name = await CommonService.GetPersonById(user_id);
      CommonService.GetMembersByGroupName(group_name)
        .then(function(members) {
          members.forEach( (member) => {
            HelperService.PollMember(requestor_name, member, group_name, bot);
          });
          deferred.resolve('Poll started.');
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

/* Function to retrieve poll results for the whole lunch group */
function GetPollResults(message) {
  var deferred = Q.defer();
  var user_id = message.data.personId;
  var input = message.match[1];
  HelperService.ValidateResultsInput(input, user_id)
    .then(function(group_name) {
      HelperService.GetPollResults(group_name, user_id)
        .then(function(results) {
          text = HelperService.BuildResultsText(results, group_name);
          deferred.resolve(text);
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