//
// Command: help
//

module.exports = Controller;

function Controller(controller) {
  controller.hears('help', 'direct_message,direct_mention', function(bot, message) {
    var text = "Here are my skills:";
    text += "\n- **Create lunch group**" + "\n" + "    * " +
      "Usage: " + bot.appendMention(message, "group <group_name> <cec1> <cec2> ...") +
      " E.g. group hogwarts hpotter rweasley. Two or more CECs required (including your own).";
    text += "\n- **Join lunch group**" + "\n" + "    * " +
      "Usage: " + bot.appendMention(message, "join <group_name>") +
      " E.g. join hogwarts.";
    text += "\n- **List lunch groups**" + "\n" + "    * " +
      "Usage: " + bot.appendMention(message, "list");
    text += "\n- **Poll lunch group**" + "\n" + "    * " +
      "Usage: " + bot.appendMention(message, "poll <group_name>") +
      " E.g. poll hogwarts.";
    text += "\n\nHelp will always be given at Hogwarts to those who deserve it.";
    bot.reply(message, text);
  });
}
