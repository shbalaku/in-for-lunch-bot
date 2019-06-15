// List Lunch Groups Services
const Q = require('q');

/* LOAD CLIENTS/MODULES */
const HelperService = require('./helper');

var service = {};

service.List = List;

module.exports = service;

/* Function which lists all of the requestor's lunch groups */
function List(message) {
  var deferred = Q.defer();
  var user_id = message.data.personId;
  HelperService.GetGroupsByPersonId(user_id)
    .then(function(groups) {
      var text = HelperService.BuildText(groups);
      deferred.resolve(text);
    })
    .catch(function(error) {
      deferred.reject(error);
    });
  return deferred.promise;
}
