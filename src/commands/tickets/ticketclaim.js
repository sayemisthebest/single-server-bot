const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');

module.exports = {
  name: 'ticketclaim',
  description: 'Claim the current ticket.',
  async execute(message) {
    if (!message.guild) return;
    if (!hasStaffPermission(message.member)) {
      await message.reply({ embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can use this command.')] });
      return;
    }

    await message.reply({ embeds: [successEmbed('Ticket Claimed', `This ticket has been claimed by ${message.author.tag}.`)] });
  },
};
