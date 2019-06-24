//
// Main script
//

const GroupService = require('./utils/app-services/group/index');
const ListGroupService = require('./utils/app-services/list/index');
const PollGroupService = require('./utils/app-services/poll/index');
const UpdatePollService = require('./utils/app-services/update/index');
const PokeGroupService = require('./utils/app-services/poke/index');

module.exports = Controller;

function Controller(controller) {
  //
  // Command: group <name> <cec1> <cec2> ...
  //
  controller.hears('group(.*)', 'direct_message,direct_mention', function(bot, message) {
    GroupService.CreateGroup(message)
      .then(function(resp) {
        bot.reply(message, resp.group_name + ' lunch group has been created \u{1f973} Group members have been invited \u{1f4e4}');
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
  // Command: poll [<group>]
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
  // Command: results [<group>]
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
  controller.hears('set-default(.*)', 'direct_message,direct_mention', function(bot, message) {
    GroupService.SetPrimaryGroup(message)
      .then(function(text) {
        bot.reply(message, text);
      })
      .catch(function(error) {
        bot.reply(message, error);
      });
  });
  //
  // Command: update [<group>]
  //
  controller.hears('update(.*)', 'direct_message,direct_mention', function(bot, message) {
    UpdatePollService.UpdatePoll(bot, message)
      .then(function(text) {
        bot.reply(message, text);
      })
      .catch(function(error) {
        bot.reply(message, error);
      });
  });
  //
  // Command: poke [<group>]
  //
  controller.hears('poke(.*)', 'direct_message,direct_mention', function(bot, message) {
    PokeGroupService.PokeGroup(bot, message)
      .then(function(text) {
        bot.reply(message, text);
      })
      .catch(function(error) {
        bot.reply(message, error);
      });
  });
}
