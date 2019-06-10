// List Lunch Groups Services
const Q = require('q');

/* LOAD CLIENTS/MODULES */
const HelperService = require('./helper');

var service = {};

service.List = List;

module.exports = service;

/* ENVIRONMENT VARIABLES */
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN;

/* Function which lists all of the requestor's lunch groups */
function List(message) {
  var deferred = Q.defer();
  var user_cec = message.data.personEmail.split(EMAIL_DOMAIN)[0];
  HelperService.GetGroupsByCEC(user_cec)
    .then(function(groups) {
      var text = HelperService.BuildText(groups);
      deferred.resolve(text);
    })
    .catch(function(error) {
      deferred.reject(error);
    });
  return deferred.promise;
}
