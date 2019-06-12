// Poll Lunch Group Services
const Q = require('q');

/* LOAD CLIENTS/MODULES */
const HelperService = require('./helper');
const CommonService = require('./../../common');

var service = {};

service.PollGroup = PollGroup;

module.exports = service;

/* ENVIRONMENT VARIABLES */
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN;

/* Function which allows user to join group */
function PollGroup(bot, message) {
  var deferred = Q.defer();
  var requestor_cec = message.data.personEmail.split(EMAIL_DOMAIN)[0];
  var request = message.match[1];
  HelperService.ValidateInput(request, requestor_cec)
    .then(async function(group) {
      var requestor_details = await CommonService.GetPersonByCEC(requestor_cec);
      var requestor = requestor_details.items[0];
      group.members.forEach( (member) => {
        HelperService.PollMember(requestor.firstName, member.cec, group.name, bot);
      });
      deferred.resolve('Poll started.');
    })
    .catch(function(error) {
      deferred.reject(error);
    });
  return deferred.promise;
}
