/* Script to automatically generate polls */
const CommonService = require('./utils/common');

module.exports = Controller;

function Controller(controller) {
  var bot = controller.spawn({});
  bot.trigger('auto_poll', [bot]);
  bot.on('auto_poll', function(bot) {
    CommonService.GetMembersByGroupName('TEST')
      .then(function(members) {
        members.forEach(member => {
          CommonService.PollMember('AutoPoller', member.name, member.id, 'TEST', bot);
        });
      });
  });
}
