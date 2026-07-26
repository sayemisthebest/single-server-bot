const { AttachmentBuilder } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');
const fs = require('fs');
const path = require('path');

function parseMessageLink(link) {
  const regex = /https?:\/\/(?:ptb|canary\.)?discord(?:app)?\.com\/channels\/(?<guild>\d+)\/(?<channel>\d+)\/(?<message>\d+)/;
  const result = link.match(regex);
  if (!result?.groups) return null;
  return result.groups;
}

module.exports = {
  name: 'afterpost',
  description: 'Find users who posted after a given message in the same channel.',
  async execute(message, args) {
    if (!message.guild) return;
    if (!hasStaffPermission(message.member)) {
      await message.reply({ embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can use this command.')] });
      return;
    }

    const link = args[0];
    if (!link) {
      await message.reply({ embeds: [errorEmbed('Invalid Message Link', 'Please provide a valid Discord message link.')] });
      return;
    }

    const parsed = parseMessageLink(link);
    if (!parsed) {
      await message.reply({ embeds: [errorEmbed('Invalid Message Link', 'The provided URL is not a valid Discord message link.')] });
      return;
    }

    if (parsed.guild !== message.guild.id) {
      await message.reply({ embeds: [errorEmbed('Guild Mismatch', 'The message link does not belong to this server.')] });
      return;
    }

    const channel = message.guild.channels.cache.get(parsed.channel);
    if (!channel?.isTextBased()) {
      await message.reply({ embeds: [errorEmbed('Channel Not Found', 'The channel from the message link could not be found.')] });
      return;
    }

    let targetMessage;
    try {
      targetMessage = await channel.messages.fetch(parsed.message);
    } catch {
      await message.reply({ embeds: [errorEmbed('Deleted Message', 'The message could not be fetched.')] });
      return;
    }

    const messages = await channel.messages.fetch({ after: targetMessage.id, limit: 100 });
    const rows = [];
    for (const item of messages.values()) {
      if (item.createdTimestamp <= targetMessage.createdTimestamp) continue;
      rows.push({
        username: item.author.username,
        displayName: item.member?.displayName || item.author.username,
        id: item.author.id,
        timestamp: item.createdAt.toISOString(),
        link: `https://discord.com/channels/${message.guild.id}/${channel.id}/${item.id}`,
        count: 1,
      });
    }

    const csv = 'Username,Display Name,Discord ID,Message Timestamp,Message Link,Message Count\n' + rows.map((row) => `${row.username},${row.displayName},${row.id},${row.timestamp},${row.link},${row.count}`).join('\n');
    const outputPath = path.join(__dirname, '..', '..', '..', 'logs', `${message.id}-afterpost.csv`);
    fs.writeFileSync(outputPath, csv, 'utf8');
    const attachment = new AttachmentBuilder(outputPath).setName('afterpost.csv');

    await message.reply({
      embeds: [successEmbed('After Post Analysis Complete', `Found ${rows.length} messages after the provided message.`)],
      files: [attachment],
    });
  },
};
