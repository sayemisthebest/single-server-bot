const { db } = require('../../database');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');

module.exports = {
  name: 'setstaffchannel',
  description: 'Set the private staff channel for this server.',
  async execute(message, args) {
    if (!message.guild) return;
    if (!hasStaffPermission(message.member)) {
      await message.reply({ embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can use this command.')] });
      return;
    }

    const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
    if (!channel?.isTextBased?.() || !channel.permissionsFor) {
      await message.reply({ embeds: [errorEmbed('Invalid Channel', 'Please mention a valid channel or provide a channel ID.')] });
      return;
    }

    const everyoneCanView = channel.permissionsFor(message.guild.roles.everyone)?.has('ViewChannel');
    if (everyoneCanView) {
      await message.reply({ embeds: [errorEmbed('Channel Must Be Private', 'The staff channel must deny View Channel to @everyone before it can be configured.')] });
      return;
    }

    db.prepare('INSERT INTO guild_configs (guild_id, staff_channel_id, prefix) VALUES (?, ?, ?) ON CONFLICT(guild_id) DO UPDATE SET staff_channel_id = excluded.staff_channel_id').run(message.guild.id, channel.id, '!');
    await message.reply({ embeds: [successEmbed('Staff Channel Updated', `Commands will now be accepted in ${channel}.`)] });
  },
};
