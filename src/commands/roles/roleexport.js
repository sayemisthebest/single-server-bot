const { AttachmentBuilder } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'roleexport',
  description: 'Export members in a role to CSV.',
  async execute(message, args) {
    if (!message.guild) return;
    if (!hasStaffPermission(message.member)) {
      await message.reply({ embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can use this command.')] });
      return;
    }

    let role = null;
    if (message.mentions?.roles?.first) {
      role = message.mentions.roles.first();
    }
    if (!role) {
      const roleId = typeof args[0] === 'string' ? args[0].replace(/[<@&>]/g, '') : args[0];
      role = message.guild.roles.cache.get(roleId);
      if (!role && roleId) {
        try {
          role = await message.guild.roles.fetch(roleId);
        } catch {
          role = null;
        }
      }
    }
    if (!role) {
      await message.reply({ embeds: [errorEmbed('Invalid Role', 'Please mention a valid role.')] });
      return;
    }

    const rows = role.members.map((member) => ({
      username: member.user.username,
      displayName: member.displayName,
      nickname: member.nickname || '',
      id: member.id,
      joinedAt: member.joinedAt?.toISOString() || '',
      createdAt: member.user.createdAt?.toISOString() || '',
      roles: member.roles.cache.filter((r) => r.id !== message.guild.id).map((r) => r.name).join('|'),
      premium: member.premiumSince ? 'Yes' : 'No',
      bot: member.user.bot ? 'Yes' : 'No',
      avatar: member.user.displayAvatarURL({ dynamic: true }),
    }));

    const header = 'Username,Display Name,Nickname,Discord ID,Joined Server Date,Account Creation Date,Current Roles,Boost Status,Bot/Not Bot,Avatar URL\n';
    const csv = header + rows.map((row) => Object.values(row).map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const outputPath = path.join(__dirname, '..', '..', '..', 'logs', `${message.id}-roleexport.csv`);
    fs.writeFileSync(outputPath, csv, 'utf8');
    const attachment = new AttachmentBuilder(outputPath).setName('roleexport.csv');
    await message.reply({
      embeds: [successEmbed('Role Export Complete', `Exported ${rows.length} users to CSV.`)],
      files: [attachment],
    });
  },
};
