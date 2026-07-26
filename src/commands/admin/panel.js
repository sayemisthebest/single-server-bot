const { db } = require('../../database');
const { errorEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');

module.exports = {
  name: 'panel',
  description: 'Open the RHINOMODERATION dashboard.',
  async execute(message, args, client) {
    if (!message.guild) return;
    if (!hasStaffPermission(message.member)) {
      await message.reply({ embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can open the dashboard.')] });
      return;
    }

    const guildConfig = db.prepare('SELECT staff_channel_id FROM guild_configs WHERE guild_id = ?').get(message.guild.id);
    if (guildConfig?.staff_channel_id && message.channel.id !== guildConfig.staff_channel_id) {
      return;
    }

    await client.dashboardHandler.launchDashboard(message);
  },
};
