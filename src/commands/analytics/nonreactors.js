const { AttachmentBuilder } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');

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

    if (message.guild.members.cache.size < (message.guild.memberCount || 0)) {
      try {
        await message.guild.members.fetch();
      } catch {
        // ignore fetch failures, fallback to cached members
      }
    }

    const { PermissionsBitField } = require('discord.js');
    const requiredPermissions = [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.ReadMessageHistory,
      PermissionsBitField.Flags.AddReactions,
    ];

    const eligibleMembers = message.guild.members.cache.filter((member) => {
      if (member.user.bot) return false;
      const permissions = channel.permissionsFor(member);
      return permissions?.has(requiredPermissions, true);
    });

    const nonReactors = eligibleMembers
      .filter((member) => !reactionUsers.has(member.id))
      .map((member) => member.user.username);

    const csv = 'Username\n' + nonReactors.join('\n');

    const attachment = new AttachmentBuilder(Buffer.from(csv, 'utf8'), { name: 'nonreactors.csv' });

    await message.reply({
      embeds: [successEmbed('Nonreactors Report Complete', `Found ${nonReactors.length} users who did not react to the message.`)],
      files: [attachment],
    });
  },
};
