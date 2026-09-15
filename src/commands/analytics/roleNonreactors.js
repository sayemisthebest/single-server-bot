const { AttachmentBuilder } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');

function parseMessageLink(link) {
  const regex = /https?:\/\/(?:ptb|canary\.)?discord(?:app)?\.com\/channels\/(?<guild>\d+)\/(?<channel>\d+)\/(?<message>\d+)/;
  const result = link.match(regex);
  if (!result?.groups) return null;
  return result.groups;
}

function resolveRole(message, rawRole) {
  const roleId = rawRole?.toString().replace(/[<@&>]/g, '');
  return message.mentions.roles?.first?.() || message.guild.roles.cache.get(roleId);
}

module.exports = {
  name: 'rolenonreactors',
  description: 'List members of a role who did not react to a specific message.',
  async execute(message, args) {
    if (!message.guild) return;
    if (!hasStaffPermission(message.member)) {
      await message.reply({ embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can use this command.')] });
      return;
    }

    const role = resolveRole(message, args[0]);
    const link = args[1];
    if (!role || !link) {
      await message.reply({ embeds: [errorEmbed('Missing Input', 'Please provide a target role and a Discord message link.')] });
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
        if (!user.bot) reactionUsers.add(user.id);
      }
    }

    try {
      await message.guild.members.fetch();
    } catch {
      // Use the available role membership cache if a full fetch is unavailable.
    }

    const eligibleMembers = role.members.filter((member) => {
      if (member.user.bot) return false;
      const permissions = channel.permissionsFor(member);
      return permissions?.has(['ViewChannel', 'ReadMessageHistory', 'AddReactions'], true);
    });

    const nonReactors = eligibleMembers
      .filter((member) => !reactionUsers.has(member.id))
      .map((member) => [member.user.username, member.displayName, member.id]);

    const csv = [
      'Username,Display Name,Discord ID',
      ...nonReactors.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const attachment = new AttachmentBuilder(Buffer.from(csv, 'utf8'), { name: 'role-nonreactors.csv' });
    await message.reply({
      embeds: [successEmbed('Rolewise Nonreactors Report Complete', `Found ${nonReactors.length} members of ${role} who did not react to the message.`)],
      files: [attachment],
    });
  },
};
