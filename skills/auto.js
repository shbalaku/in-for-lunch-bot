/* Script to automatically generate polls */
const CommonService = require('./utils/common');

module.exports = Controller;

function Controller(controller) {
  controller.spawn({}, function(bot) {
    CommonService.GetMembersByGroupName('TEST')
      .then(function(members) {
        members.forEach(member => {
          bot.startPrivateConversationWithPersonId(member.id, function(err, convo) {
            convo.say('Automatically generated message');
          });
        });
      });
  });
}
