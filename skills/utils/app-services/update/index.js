// Update Poll Answers Service
const Q = require('q');

/* ENVIRONMENT VARIABLES */
const PATH = process.env.PATH;

/* LOAD CLIENTS/MODULES */
const HelperService = require('./helper');
const CommonService = require(PATH + '/skills/utils/common');

var service = {};

service.UpdatePoll = UpdatePoll;

module.exports = service;

/* Function which allows user to update group poll */
function UpdatePoll(bot, message) {
  var deferred = Q.defer();
  var user_id = message.data.personId;
  var input = message.match[1];
  HelperService.ValidateInput(input)
    .then(function(group_name){
      var requestor_name = await CommonService.GetPersonById(user_id);
      CommonService.PollMember(requestor_name, requestor_name, user_id, group_name, bot);
      deferred.resolve('Ok, another poll is about to be sent to you.');
    })
    .catch(function(error) {
      deferred.reject(error);
    });
  return deferred.promise;
}
