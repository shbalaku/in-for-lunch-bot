//
// Main script
//

var LunchGroupService = require('./utils/app-services/group/group');

module.exports = Controller;

function Controller(controller) {
  //
  // Command: create lunch group
  //
  controller.hears('group(.*)', 'direct_message,direct_mention', async function(bot, message) {
    LunchGroupService.CreateGroup(message)
      .then(function(group) {
        bot.reply(message, group.name + ' lunch group has been created. Group members have been invited.');
        LunchGroupService.NotifyGroupJoin(group);
      })
      .catch(function(error) {
        bot.reply(message, error);
      });
  });
}
