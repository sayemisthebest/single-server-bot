const { db } = require('../../database');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');

module.exports = {
  name: 'resetconfig',
  description: 'Reset the configuration for this server.',
  async execute(message) {
    if (!message.guild) return;
    if (!hasStaffPermission(message.member)) {
      await message.reply({ embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can reset config.')] });
      return;
    }

    db.prepare('DELETE FROM guild_configs WHERE guild_id = ?').run(message.guild.id);
    db.prepare('DELETE FROM ticket_configs WHERE guild_id = ?').run(message.guild.id);
    await message.reply({ embeds: [successEmbed('Configuration Reset', 'The guild configuration has been reset.')] });
  },
};
