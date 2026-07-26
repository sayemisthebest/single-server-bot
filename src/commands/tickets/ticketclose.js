const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');

module.exports = {
  name: 'ticketclose',
  description: 'Close the current ticket.',
  async execute(message) {
    if (!message.guild) return;
    if (!hasStaffPermission(message.member)) {
      await message.reply({ embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can use this command.')] });
      return;
    }

    if (!message.channel.name.includes('ticket')) {
      await message.reply({ embeds: [errorEmbed('Invalid Ticket Channel', 'This command can only be used in a ticket channel.')] });
      return;
    }

    await message.reply({ embeds: [successEmbed('Ticket Closed', 'The ticket has been closed.')] });
  },
};
