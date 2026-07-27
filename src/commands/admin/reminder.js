const { hasStaffPermission } = require('../../utils/permissions');
const { errorEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'reminder',
  description: 'Open the reminder center dashboard.',
  async execute(message) {
    if (!message.guild) return;
    if (!hasStaffPermission(message.member)) {
      await message.reply({ embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can use this command.')] });
      return;
    }

    const guildConfig = require('../../database').db.prepare('SELECT staff_channel_id FROM guild_configs WHERE guild_id = ?').get(message.guild.id);
    if (guildConfig?.staff_channel_id && message.channel.id !== guildConfig.staff_channel_id) {
      await message.reply({ embeds: [errorEmbed('Staff Channel Only', 'This command must be used inside the configured private staff channel.')] });
      return;
    }

    await message.client.dashboardHandler.launchReminderCenter(message);
  },
};
