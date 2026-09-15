const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { errorEmbed, successEmbed, warningEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');
const { createCSV, parseUsernameList } = require('../../utils/csv');

module.exports = {
  name: 'roleadd',
  description: 'Add a role to members from a TXT upload.',
  async execute(message, args) {
    if (!message.guild) return;
    if (!hasStaffPermission(message.member)) {
      await message.reply({ embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can use this command.')] });
      return;
    }

    const attachment = message.attachments.first();
    if (!attachment) {
      await message.reply({ embeds: [errorEmbed('Missing File', 'Please upload a TXT or CSV file containing usernames, one per line.')] });
      return;
    }

    const fileName = attachment.name.toLowerCase();
    if (!fileName.endsWith('.txt') && !fileName.endsWith('.csv')) {
      await message.reply({ embeds: [errorEmbed('Wrong File Type', 'Please upload a TXT or CSV file.')] });
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

    const filePath = path.join(__dirname, '..', '..', '..', 'logs', `${message.id}-${attachment.name}`);
    const response = await fetch(attachment.url);
    const content = await response.text();
    fs.writeFileSync(filePath, content, 'utf8');

    const usernames = parseUsernameList(content);
    const added = [];
    const skippedNotFound = [];
    const skippedAlready = [];
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
      const matches = message.guild.members.cache.filter((member) => {
        const name = member.user.username.toLowerCase();
        const displayName = member.displayName.toLowerCase();
        const nickname = member.nickname?.toLowerCase() || '';
        return [name, displayName, nickname].includes(username.toLowerCase());
      }).values();

      const matched = Array.from(matches);
      if (matched.length === 0) {
        skippedNotFound.push(username);
        continue;
      }
      if (matched.length > 1) {
        failedMultiple.push(username);
        continue;
      }

      const targetMember = matched[0];
      if (targetMember.roles.cache.has(role.id)) {
        skippedAlready.push(username);
        continue;
      }
      try {
        await targetMember.roles.add(role);
        added.push(username);
      } catch {
        failed.push(username);
      }
    }

    const summaryLines = [
      `Added: ${added.length}`,
      `Skipped (not found): ${skippedNotFound.length}`,
      `Skipped (already has role): ${skippedAlready.length}`,
      `Failed (ambiguous or error): ${failedMultiple.length + failed.length}`,
    ];
    await message.reply({ embeds: [successEmbed('Role Assignment Complete', summaryLines.join('\n'))] });
    const csvRows = [
      ...added.map((username) => [username, 'Added']),
      ...skippedNotFound.map((username) => [username, 'Skipped - Not Found']),
      ...skippedAlready.map((username) => [username, 'Skipped - Already Has Role']),
      ...failedMultiple.map((username) => [username, 'Failed - Multiple Matches']),
      ...failed.map((username) => [username, 'Failed - Error']),
    ];
    if (csvRows.length > 0) {
      const csv = createCSV(['Username', 'Status'], csvRows);
      const outputPath = path.join(__dirname, '..', '..', '..', 'logs', `${message.id}-roleadd.csv`);
      fs.writeFileSync(outputPath, csv, 'utf8');
      const attachment = new AttachmentBuilder(outputPath).setName('roleadd.csv');
      await message.reply({
        embeds: [warningEmbed('CSV Report', 'Role add results exported.')],
        files: [attachment],
      });
    }
  },
};
