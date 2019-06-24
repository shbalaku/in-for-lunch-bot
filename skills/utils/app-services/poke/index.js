// Poke Incomplete Pollers Service
const Q = require('q');

/* ENVIRONMENT VARIABLES */
const PATH = process.env.PATH;

/* LOAD CLIENTS/MODULES */
const HelperService = require('./helper');
const CommonService = require(PATH + '/skills/utils/common');

var service = {};

service.PokeGroup = PokeGroup;

module.exports = service;

/* Function which allows user to nudge incomplete pollers in a group */
function PokeGroup(bot, message) {
  var deferred = Q.defer();
  var user_id = message.data.personId;
  var input = message.match[1];
  CommonService.ValidateGroupAndUser(input, user_id)
    .then(function(group_name){
      HelperService.IsPokeValid(group_name)
        .then(async function() {
          // Poke valid
          // Get members yet to complete poll
          var in_progress_pollers = await HelperService.GetPollersInProgressIDs(group_name);
          if (in_progress_pollers.length != 0) {
            var requestor_name = await CommonService.GetPersonById(user_id);
            // Create poke message
            var message = '\u{1f449} ' + requestor_name + ' poked you!' +
              ' To complete the latest poll, please type `update ' + group_name + '`.';
            // Send pokes
            in_progress_pollers.forEach(poller => {
              bot.startPrivateConversationWithPersonId(poller.id, function(err, convo) {
                if (err) console.error(err);
                convo.say(message);
              });
            });
            var text = 'Pokes have been sent.';
            deferred.resolve(text);
          } else {
            var errMsg = 'Everyone has completed the poll. No pokes were sent.' +
              '\n\nTo see the results of the poll, please type: `results ' + group_name + '`.';
            deferred.reject(errMsg);
          }
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
