const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');

module.exports = {
  name: 'ticketremove',
  description: 'Remove a user from the current ticket.',
  async execute(message, args) {
    if (!message.guild) return;
    if (!hasStaffPermission(message.member)) {
      await message.reply({ embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can use this command.')] });
      return;
    }

    const user = message.mentions.members?.first() || message.guild.members.cache.get(args[0]);
    if (!user) {
      await message.reply({ embeds: [errorEmbed('Invalid User', 'Please mention a valid user.')] });
      return;
    }

    await message.channel.permissionOverwrites.edit(user.id, { ViewChannel: false, SendMessages: false });
    await message.reply({ embeds: [successEmbed('User Removed', `${user.user.tag} has been removed from the ticket.`)] });
  },
};
