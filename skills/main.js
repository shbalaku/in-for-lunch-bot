//
// Main script
//

const GroupService = require('./utils/app-services/group/index');
const ListGroupService = require('./utils/app-services/list/index');
const PollGroupService = require('./utils/app-services/poll/index');

module.exports = Controller;

function Controller(controller) {
  //
  // Command: group <name> <cec1> <cec2> ...
  //
  controller.hears('group (.*)', 'direct_message,direct_mention', function(bot, message) {
    GroupService.CreateGroup(message)
      .then(function(resp) {
        bot.reply(message, resp.group_name + ' lunch group has been created. Group members have been invited.');
        GroupService.NotifyGroupJoin(resp, bot);
      })
      .catch(function(error) {
        bot.reply(message, error);
      });
  });
  //
  // Command: list
  //
  controller.hears('list', 'direct_message,direct_mention', function(bot, message) {
    ListGroupService.List(message)
      .then(function(text) {
        bot.reply(message, text);
      })
      .catch(function(error) {
        bot.reply(message, error);
      });
  });
  //
  // Command: poll <group>
  //
  controller.hears('poll(.*)', 'direct_message,direct_mention', function(bot, message) {
    PollGroupService.PollGroup(bot, message)
      .then(function(text) {
        bot.reply(message, text);
      })
      .catch(function(error) {
        bot.reply(message, error);
      });
  });
  //
  // Command: results <group>
  //
  controller.hears('results(.*)', 'direct_message,direct_mention', function(bot, message) {
    PollGroupService.GetPollResults(message)
      .then(function(text) {
        bot.reply(message, text);
      })
      .catch(function(error) {
        bot.reply(message, error);
      });
  });
  //
  // Command: set-default <group>
  //
  controller.hears('set-default (.*)', 'direct_message,direct_mention', function(bot, message) {
    GroupService.SetPrimaryGroup(message)
      .then(function(text) {
        bot.reply(message, text);
      })
      .catch(function(error) {
        bot.reply(message, error);
      });
  });
}
