// Join Lunch Group Services
const Q = require('q');

/* LOAD CLIENTS/MODULES */
const HelperService = require('./helper');

var service = {};

service.JoinGroup = JoinGroup;

module.exports = service;

/* ENVIRONMENT VARIABLES */
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN;

/* Function which allows user to join group */
function JoinGroup(message) {
  var deferred = Q.defer();
  var user_cec = message.data.personEmail.split(EMAIL_DOMAIN)[0];
  var input = message.match[1];
  HelperService.ValidateInput(input, user_cec)
    .then(function(resp) {
      deferred.resolve(resp);
    })
    .catch(function(error) {
      deferred.reject(error);
    });
  return deferred.promise;
}
