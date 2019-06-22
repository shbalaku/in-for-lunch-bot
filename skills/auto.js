/* Script to automatically generate polls */
module.exports = Controller;

function Controller(controller) {
  //
  // Command: hello world
  //
  controller.hears('hello world', 'direct_message,direct_mention', function(bot, message) {
    bot.reply(message, 'Hey there!');
  });
}
