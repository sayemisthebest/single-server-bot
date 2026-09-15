const { EmbedBuilder, MessageFlags } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');

function parseMonth(monthText) {
  const match = monthText?.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;

  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1));
  return { year, month, startDate, endDate };
}

function getCurrentMonth() {
  const now = new Date();
  return parseMonth(`${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`);
}

async function countPosts(channel, monthInfo = getCurrentMonth()) {
  let total = 0;
  let before;

  while (true) {
    const options = { limit: 100 };
    if (before) options.before = before;

    const messages = await channel.messages.fetch(options);
    if (!messages?.size) break;

    const batch = Array.from(messages.values());
    total += batch.filter((message) => {
      const createdAt = message.createdAt || new Date(message.createdTimestamp);
      return !message.author.bot && createdAt >= monthInfo.startDate && createdAt < monthInfo.endDate;
    }).length;

    const oldestMessage = batch[batch.length - 1];
    const oldestCreatedAt = oldestMessage?.createdAt || new Date(oldestMessage?.createdTimestamp);
    if (oldestCreatedAt < monthInfo.startDate) break;

    if (batch.length < 100) break;
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

function formatMonth(monthInfo) {
  return monthInfo.startDate.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

async function sendResponse(target, options) {
  if (!isInteraction(target)) return target.reply(options);
  if (target.deferred || target.replied) return target.editReply(options);
  return target.reply({ ...options, flags: MessageFlags.Ephemeral });
}

module.exports = {
  name: 'postcount',
  description: 'Count human-authored posts in a channel.',
  async execute(target, args) {
    if (!target.guild) return;

    const interaction = isInteraction(target);
    if (!hasStaffPermission(target.member)) {
      await sendResponse(target, { embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can use this command.')] });
      return;
    }

    const channel = getChannel(target, args);
    if (!channel?.isTextBased?.() || typeof channel.messages?.fetch !== 'function') {
      await sendResponse(target, { embeds: [errorEmbed('Invalid Channel', 'Please mention a valid text channel or provide a channel ID.')] });
      return;
    }

    if (interaction && !target.deferred && !target.replied) {
      await target.deferReply({ flags: MessageFlags.Ephemeral });
    }

    try {
      const monthInfo = parseMonth(args[1]) || getCurrentMonth();
      const total = await countPosts(channel, monthInfo);
      const embed = new EmbedBuilder()
        .setTitle('Post Count Complete')
        .setDescription(`Found **${total}** human-authored posts in ${channel} during **${formatMonth(monthInfo)}**.`)
        .setColor(0x3498db)
        .setTimestamp()
        .setFooter({ text: 'Bot messages are excluded.' });

      await sendResponse(target, { embeds: [embed] });
    } catch (error) {
      await sendResponse(target, { embeds: [errorEmbed('Unable to Read Messages', `The bot could not read messages from ${channel}. ${error.message}`)] });
    }
  },
  countPosts,
  parseMonth,
  formatMonth,
};