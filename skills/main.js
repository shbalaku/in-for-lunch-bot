//
// Main script
//

module.exports = Controller;

function Controller(controller) {
  //
  // Command: help
  //
  controller.hears('help', 'direct_message,direct_mention', function (bot, message) {
      var text = "Help will always be given at Hogwarts to those who deserve it.";
      bot.reply(message, text);
  });
}
