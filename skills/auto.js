/* Script to automatically generate polls */
const CommonService = require('./utils/common');

module.exports = Controller;

function Controller(controller) {
  controller.spawn({}, function(bot) {
    bot.say('Automatically generated message');
    // CommonService.GetMembersByGroupName('TEST')
    //   .then(function(members) {
    //     members.forEach(member => {
    //
    //     });
    //   });
  });
}
