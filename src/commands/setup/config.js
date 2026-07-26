const { db } = require('../../database');
const { infoEmbed, errorEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');

module.exports = {
  name: 'config',
  description: 'Show the current server configuration.',
  async execute(message) {
    if (!message.guild) return;
    if (!hasStaffPermission(message.member)) {
      await message.reply({ embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can view config.')] });
      return;
    }

    const config = db.prepare('SELECT * FROM guild_configs WHERE guild_id = ?').get(message.guild.id);
    if (!config) {
      await message.reply({ embeds: [infoEmbed('No Configuration', 'No configuration exists for this server yet. Run !setup.')] });
      return;
    }

    const description = `Staff Channel: ${config.staff_channel_id || 'Not set'}\nPrefix: ${config.prefix}`;
    await message.reply({ embeds: [infoEmbed('Server Configuration', description)] });
  },
};
