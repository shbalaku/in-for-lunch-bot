//
// Main script
//

var CreateGroupService = require('./utils/app-services/group/index');
var JoinGroupService = require('./utils/app-services/join/index');

module.exports = Controller;

function Controller(controller) {
  //
  // Command: create lunch group
  //
  controller.hears('group(.*)', 'direct_message,direct_mention', async function(bot, message) {
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
  // Command: join lunch group
  //
  controller.hears('join(.*)', 'direct_message,direct_mention', async function(bot, message) {
    JoinGroupService.JoinGroup(message)
      .then(function(text) {
        bot.reply(message, text);
      })
      .catch(function(error) {
        bot.reply(message, error);
      });
  });
}
