const { EmbedBuilder } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');

async function countPosts(channel) {
  let total = 0;
  let before;

  while (true) {
    const options = { limit: 100 };
    if (before) options.before = before;

    const messages = await channel.messages.fetch(options);
    if (!messages?.size) break;

    const batch = Array.from(messages.values());
    total += batch.filter((message) => !message.author.bot).length;

    if (batch.length < 100) break;
    const oldestMessage = batch[batch.length - 1];
    if (!oldestMessage?.id || oldestMessage.id === before) break;
    before = oldestMessage.id;
  }

  return total;
}

function getChannel(target, args) {
  return target.mentions?.channels?.first?.() || target.guild.channels.cache.get(args[0]);
}

function isInteraction(target) {
  return typeof target.isButton === 'function' || typeof target.isSelectMenu === 'function' || typeof target.isCommand === 'function';
}

async function sendResponse(target, options) {
  if (!isInteraction(target)) return target.reply(options);
  if (target.deferred || target.replied) return target.editReply(options);
  return target.reply({ ...options, ephemeral: true });
}

module.exports = {
  name: 'postcount',
  description: 'Count human-authored posts in a channel.',
  async execute(target, args) {
    if (!target.guild) return;

    const interaction = isInteraction(target);
    if (!hasStaffPermission(target.member)) {
      await sendResponse(target, { embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can use this command.')], ephemeral: interaction });
      return;
    }

    const channel = getChannel(target, args);
    if (!channel?.isTextBased?.() || typeof channel.messages?.fetch !== 'function') {
      await sendResponse(target, { embeds: [errorEmbed('Invalid Channel', 'Please mention a valid text channel or provide a channel ID.')], ephemeral: interaction });
      return;
    }

    if (interaction && !target.deferred && !target.replied) {
      await target.deferReply({ ephemeral: true });
    }

    try {
      const total = await countPosts(channel);
      const embed = new EmbedBuilder()
        .setTitle('Post Count Complete')
        .setDescription(`Found **${total}** human-authored posts in ${channel}.`)
        .setColor(0x3498db)
        .setTimestamp()
        .setFooter({ text: 'Bot messages are excluded.' });

      await sendResponse(target, { embeds: [embed] });
    } catch (error) {
      await sendResponse(target, { embeds: [errorEmbed('Unable to Read Messages', `The bot could not read messages from ${channel}. ${error.message}`)] });
    }
  },
  countPosts,
};