// Join Lunch Group Services
const Q = require('q');

/* LOAD CLIENTS/MODULES */
const HelperService = require('./helper');

var service = {};

service.JoinGroup = JoinGroup;

module.exports = service;

/* ENVIRONMENT VARIABLES */
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN;

/* Helper function */

/* Function which allows user to join group */
function JoinGroup(message) {
  var deferred = Q.defer();
  var user_cec = message.data.personEmail.split(EMAIL_DOMAIN)[0];
  var request = message.match[1];
  HelperService.ValidateInput(request, user_cec)
    .then(function(resp) {
      deferred.resolve(resp);
    })
    .catch(function(error) {
      deferred.reject(error);
    });
  return deferred.promise;
}
