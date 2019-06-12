//
// Main script
//

const CreateGroupService = require('./utils/app-services/group/index');
const JoinGroupService = require('./utils/app-services/join/index');
const ListGroupService = require('./utils/app-services/list/index');
const PollGroupService = require('./utils/app-services/poll/index');

module.exports = Controller;

function Controller(controller) {
  //
  // Command: group <name> <cec1> <cec2> ...
  //
  controller.hears('group (.*)', 'direct_message,direct_mention', async function(bot, message) {
    CreateGroupService.CreateGroup(message)
      .then(function(group) {
        bot.reply(message, group.name + ' lunch group has been created. Group members have been invited.');
        CreateGroupService.NotifyGroupJoin(group);
      })
      .catch(function(error) {
        bot.reply(message, error);
      });
  });
  //
  // Command: join <group>
  //
  controller.hears('join (.*)', 'direct_message,direct_mention', async function(bot, message) {
    JoinGroupService.JoinGroup(message)
      .then(function(text) {
        bot.reply(message, text);
      })
      .catch(function(error) {
        bot.reply(message, error);
      });
  });
  //
  // Command: list
  //
  controller.hears('list', 'direct_message,direct_mention', async function(bot, message) {
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
  controller.hears('poll (.*)', 'direct_message,direct_mention', async function(bot, message) {
    PollGroupService.PollGroup(bot, message)
      .then(function(text) {
        bot.reply(message, text);
      })
      .catch(function(error) {
        bot.reply(message, error);
      });
  });
}
