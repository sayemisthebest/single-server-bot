const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { errorEmbed, successEmbed, warningEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');
const { createCSV } = require('../../utils/csv');

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
    const removed = [];
    const skippedNotFound = [];
    const skippedNoRole = [];
    const failedMultiple = [];
    const failed = [];

    if (message.guild.members.cache.size < (message.guild.memberCount || 0)) {
      try {
        await message.guild.members.fetch();
      } catch {
        // ignore fetch failures, use cached members
      }
    }

    for (const username of usernames) {
      const matches = Array.from(message.guild.members.cache.filter((member) => {
        const name = member.user.username.toLowerCase();
        const displayName = member.displayName.toLowerCase();
        const nickname = member.nickname?.toLowerCase() || '';
        return [name, displayName, nickname].includes(username.toLowerCase());
      }).values());

      if (matches.length === 0) {
        skippedNotFound.push(username);
        continue;
      }
      if (matches.length > 1) {
        failedMultiple.push(username);
        continue;
      }

      const targetMember = matches[0];
      if (!targetMember.roles.cache.has(role.id)) {
        skippedNoRole.push(username);
        continue;
      }
      try {
        await targetMember.roles.remove(role);
        removed.push(username);
      } catch {
        failed.push(username);
      }
    }

    const summaryLines = [
      `Removed: ${removed.length}`,
      `Skipped (not found): ${skippedNotFound.length}`,
      `Skipped (no role): ${skippedNoRole.length}`,
      `Failed (ambiguous or error): ${failedMultiple.length + failed.length}`,
    ];
    await message.reply({ embeds: [successEmbed('Role Removal Complete', summaryLines.join('\n'))] });

    const csvRows = [
      ...removed.map((username) => [username, 'Removed']),
      ...skippedNotFound.map((username) => [username, 'Skipped - Not Found']),
      ...skippedNoRole.map((username) => [username, 'Skipped - No Role']),
      ...failedMultiple.map((username) => [username, 'Failed - Multiple Matches']),
      ...failed.map((username) => [username, 'Failed - Error']),
    ];
    const csv = createCSV(['Username', 'Status'], csvRows);
    const outputPath = path.join(__dirname, '..', '..', '..', 'logs', `${message.id}-roleremove.csv`);
    fs.writeFileSync(outputPath, csv, 'utf8');
    const csvAttachment = new AttachmentBuilder(outputPath).setName('roleremove.csv');
    await message.reply({
      embeds: [warningEmbed('CSV Report', 'Role remove results exported.')],
      files: [csvAttachment],
    });
  },
};
