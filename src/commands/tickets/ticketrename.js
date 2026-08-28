const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');
const { isTicketChannel } = require('../../utils/tickets');

module.exports = {
  name: 'ticketrename',
  description: 'Rename the current ticket.',
  async execute(message, args) {
    if (!message.guild) return;
    if (!hasStaffPermission(message.member)) {
      await message.reply({ embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can use this command.')] });
      return;
    }
    if (!isTicketChannel(message.channel, message.guild)) {
      await message.reply({ embeds: [errorEmbed('Invalid Ticket Channel', 'This command can only be used inside a configured ticket channel.')] });
      return;
    }

    const name = args.join(' ');
    if (!name) {
      await message.reply({ embeds: [errorEmbed('Missing Name', 'Please provide a new channel name.')] });
      return;
    }

    await message.channel.setName(name);
    await message.reply({ embeds: [successEmbed('Ticket Renamed', `The ticket channel has been renamed to ${name}.`)] });
  },
};
