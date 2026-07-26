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
  name: 'nonreactors',
  description: 'List members who did not react to a specific message.',
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

    const reactionUsers = new Set();
    for (const reaction of targetMessage.reactions.cache.values()) {
      const users = await reaction.users.fetch();
      for (const user of users.values()) {
        if (user.bot) continue;
        reactionUsers.add(user.id);
      }
    }

    const members = message.guild.members.cache.filter((member) => !member.user.bot);
    const nonReactors = members
      .filter((member) => !reactionUsers.has(member.id))
      .map((member) => ({
        username: member.user.username,
        displayName: member.displayName || member.user.username,
        nickname: member.nickname || '',
        id: member.id,
      }));

    const csv = 'Username,Display Name,Nickname,Discord ID\n' + nonReactors
      .map((member) => `${member.username},${member.displayName},${member.nickname},${member.id}`)
      .join('\n');

    const outputPath = path.join(__dirname, '..', '..', '..', 'logs', `${message.id}-nonreactors.csv`);
    fs.writeFileSync(outputPath, csv, 'utf8');
    const attachment = new AttachmentBuilder(outputPath).setName('nonreactors.csv');

    await message.reply({
      embeds: [successEmbed('Nonreactors Report Complete', `Found ${nonReactors.length} users who did not react to the message.`)],
      files: [attachment],
    });
  },
};
