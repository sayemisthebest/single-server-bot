const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { errorEmbed, successEmbed, warningEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');

module.exports = {
  name: 'roleremove',
  description: 'Remove a role from members from a TXT upload.',
  async execute(message, args) {
    if (!message.guild) return;
    if (!hasStaffPermission(message.member)) {
      await message.reply({ embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can use this command.')] });
      return;
    }

    const attachment = message.attachments.first();
    if (!attachment) {
      await message.reply({ embeds: [errorEmbed('Missing File', 'Please upload a TXT file containing usernames, one per line.')] });
      return;
    }

    if (!attachment.name.toLowerCase().endsWith('.txt')) {
      await message.reply({ embeds: [errorEmbed('Wrong File Type', 'Please upload a TXT file.')] });
      return;
    }

    const roleId = args[0]?.toString().replace(/[<@&>]/g, '');
    let role = message.mentions.roles?.first?.() || message.guild.roles.cache.get(roleId) || message.guild.roles.cache.find((r) => r.name.toLowerCase() === args[0]?.toString().toLowerCase());
    if (!role && roleId) {
      try {
        role = await message.guild.roles.fetch(roleId);
      } catch {
        role = null;
      }
    }
    if (!role) {
      await message.reply({ embeds: [errorEmbed('Invalid Role', 'Please mention a valid role or select a role from the panel.')] });
      return;
    }

    const response = await fetch(attachment.url);
    const content = await response.text();
    const usernames = Array.from(new Set(content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)));
    const added = [];
    const skipped = [];
    const failed = [];

    for (const username of usernames) {
      const matches = Array.from(message.guild.members.cache.filter((member) => {
        const name = member.user.username.toLowerCase();
        const displayName = member.displayName.toLowerCase();
        const nickname = member.nickname?.toLowerCase() || '';
        return [name, displayName, nickname].includes(username.toLowerCase());
      }).values());

      if (matches.length === 0) {
        skipped.push(username);
        continue;
      }
      if (matches.length > 1) {
        failed.push(username);
        continue;
      }

      const targetMember = matches[0];
      if (!targetMember.roles.cache.has(role.id)) {
        skipped.push(username);
        continue;
      }
      try {
        await targetMember.roles.remove(role);
        added.push(username);
      } catch {
        failed.push(username);
      }
    }

    const summary = `Removed: ${added.length}\nSkipped: ${skipped.length}\nFailed: ${failed.length}`;
    await message.reply({ embeds: [successEmbed('Role Removal Complete', summary)] });
    const csv = 'Username,Status\n' + [...added.map((item) => `${item},Removed`), ...skipped.map((item) => `${item},Skipped`), ...failed.map((item) => `${item},Failed`)].join('\n');
    const outputPath = path.join(__dirname, '..', '..', '..', 'logs', `${message.id}-roleremove.csv`);
    fs.writeFileSync(outputPath, csv, 'utf8');
    const csvAttachment = new AttachmentBuilder(outputPath).setName('roleremove.csv');
    await message.reply({
      embeds: [warningEmbed('CSV Report', 'Role remove results exported.')],
      files: [csvAttachment],
    });
  },
};
