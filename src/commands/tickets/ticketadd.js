const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');
const { isTicketChannel } = require('../../utils/tickets');

module.exports = {
  name: 'ticketadd',
  description: 'Add a user to the current ticket.',
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

    const user = message.mentions.members?.first() || message.guild.members.cache.get(args[0]);
    if (!user) {
      await message.reply({ embeds: [errorEmbed('Invalid User', 'Please mention a valid user.')] });
      return;
    }

    await message.channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true });
    await message.reply({ embeds: [successEmbed('User Added', `${user.user.tag} has been added to the ticket.`)] });
  },
};
