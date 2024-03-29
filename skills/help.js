//
// Command: help
//

module.exports = Controller;

function Controller(controller) {
  controller.hears('help', 'direct_message,direct_mention', function(bot, message) {
    var text = "Here are my skills \u{1f60f}";
    text += "\n- **Create lunch group**" + "\n" + "    * " +
      "Usage: " + bot.appendMention(message, "group -name <group_name> -add <cec1> [ <cec2> ... ]") +
      " E.g. group -name hogwarts -add hpotter rweasley. One or more valid CECs required (excluding your own).";
    text += "\n- **List lunch groups**" + "\n" + "    * " +
      "Usage: " + bot.appendMention(message, "list");
    text += "\n- **Poll lunch group**" + "\n" + "    * " +
      "Usage: " + bot.appendMention(message, "poll [<group_name>]") +
      " E.g. poll hogwarts. If group name is omitted, your preferred lunch group will be polled.";
    text += "\n- **Set a preferred lunch group**" + "\n" + "    * " +
      "Usage: " + bot.appendMention(message, "set-default <group_name>") +
      " E.g. set-default hogwarts.";
    text += "\n- **Display poll results from your lunch group**" + "\n" + "    * " +
      "Usage: " + bot.appendMention(message, "results [<group_name>]") +
      " E.g. results hogwarts. If group name is omitted, results for your preferred lunch group will be shown.";
    text += "\n- **Update poll response for a lunch group**" + "\n" + "    * " +
      "Usage: " + bot.appendMention(message, "update [<group_name>]") +
      " E.g. update hogwarts. If group name is omitted, you will be sent an update poll for your preferred lunch group.";
    text += "\n- **Poke members of a lunch yet to complete a poll**" + "\n" + "    * " +
      "Usage: " + bot.appendMention(message, "poke [<group_name>]") +
      " E.g. poke hogwarts. If group name is omitted, your preferred lunch group will be used.";
    text += "\n\nHelp will always be given at Hogwarts to those who deserve it \u{1f9d9}";
    bot.reply(message, text);
  });
}
