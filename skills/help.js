//
// Command: help
//

module.exports = Controller;

function Controller(controller) {
  controller.hears('help', 'direct_message,direct_mention', function(bot, message) {
    var text = "Here are my skills:";
    text += "\n- **Create lunch group**" + "\n" + "    * " +
      "Usage: " + bot.appendMention(message, "group <group_name> <cec1> <cec2> ...") +
      " E.g. group hogwarts hpotter rweasley. Two or more CECs required.";
    text += "\n\nHelp will always be given at Hogwarts to those who deserve it.";
    bot.reply(message, text);
  });
}
