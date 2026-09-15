const { AttachmentBuilder } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');
const { createCSV } = require('../../utils/csv');

function parseMessageLink(link) {
  const regex = /https?:\/\/(?:ptb|canary\.)?discord(?:app)?\.com\/channels\/(?<guild>\d+)\/(?<channel>\d+)\/(?<message>\d+)/;
  const result = link.match(regex);
  if (!result?.groups) return null;
  return result.groups;
}

module.exports = {
  name: 'reactionlist',
  description: 'List users who reacted to a message and those who did not.',
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

    const reactionUsers = [];
    for (const [emoji, reaction] of targetMessage.reactions.cache) {
      const users = await reaction.users.fetch();
      for (const user of users.values()) {
        if (user.bot) continue;
        reactionUsers.push({ id: user.id, username: user.username, displayName: user.displayName || user.username, nickname: user.username, reaction: emoji });
      }
    }

    const members = message.guild.members.cache.filter((member) => !member.user.bot);
    const reactedIds = new Set(reactionUsers.map((item) => item.id));
    const nonReacted = members.filter((member) => !reactedIds.has(member.id)).map((member) => ({ id: member.id, username: member.user.username, displayName: member.displayName, nickname: member.nickname || '', reaction: 'No Reaction' }));

    const csvRows = [...reactionUsers, ...nonReacted];
    const csv = createCSV(
      ['Username', 'Display Name', 'Nickname', 'Discord ID', 'Reaction Emoji'],
      csvRows.map((row) => [row.username, row.displayName, row.nickname, row.id, row.reaction]),
    );
    const attachment = new AttachmentBuilder(Buffer.from(csv, 'utf8'), { name: 'reactionlist.csv' });

    await message.reply({
      embeds: [successEmbed('Reaction Analysis Complete', `Processed ${csvRows.length} users.`)],
      files: [attachment],
    });
  },
};
