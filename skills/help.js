//
// Command: help
//

module.exports = Controller;

function Controller(controller) {
  controller.hears('help', 'direct_message,direct_mention', function(bot, message) {
    console.log(message.data);
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
    text += "\n\nHelp will always be given at Hogwarts to those who deserve it \u{1f9d9}";
    bot.reply(message, text);
  });
}
