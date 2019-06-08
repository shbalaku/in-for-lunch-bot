//
// Main script
//

var LunchGroupService = require('./utils/group');

module.exports = Controller;

function Controller(controller) {
  //
  // Command: create lunch group
  //
  controller.hears('group(.*)', 'direct_message,direct_mention', async function(bot, message) {
    var query = message.match[1];
    LunchGroupService.CreateGroup(query)
      .then(function(group_name) {
        LunchGroupService.NotifyGroupJoin(group_name)
          .then(function(resp) {
            bot.reply(message, resp);
          });
      })
      .catch(function(error) {
        bot.reply(message, error);
      });
  });
}
