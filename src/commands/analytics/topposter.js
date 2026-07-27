const { AttachmentBuilder } = require('discord.js');
const { errorEmbed, successEmbed, warningEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');

function parseMonth(monthText) {
  if (!monthText) return null;
  const match = monthText.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

function getMonthRange(year, month) {
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  return { startDate, endDate, startISO: startDate.toISOString(), endISO: endDate.toISOString() };
}

function getChannelFromTarget(target, args) {
  if (!target.guild) return null;
  return target.mentions?.channels?.first() || target.guild.channels.cache.get(args[0]);
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countLinks(text) {
  return (text.match(/https?:\/\/[^\s]+/g) || []).length;
}

async function sendInteractionResponse(target, options) {
  const isInteraction = typeof target.isButton === 'function' || typeof target.isSelectMenu === 'function' || typeof target.isCommand === 'function';
  if (!isInteraction) {
    return await target.reply(options);
  }

  if (target.deferred || target.replied) {
    try {
      return await target.editReply(options);
    } catch (editError) {
      try {
        if (!target.replied) {
          return await target.reply(options);
        }
        return await target.followUp(options);
      } catch (replyError) {
        throw replyError;
      }
    }
  }

  return await target.reply(options);
}

async function fetchMonthlyMessages(channel, startDate, endDate) {
  const messages = [];
  let lastId;
  let pages = 0;

  while (pages < 100) {
    const options = { limit: 100 };
    if (lastId) {
      options.before = lastId;
    }

    const fetched = await channel.messages.fetch(options);
    if (!fetched || fetched.size === 0) {
      break;
    }

    const batch = Array.from(fetched.values());
    const oldest = batch[batch.length - 1];

    for (const message of batch) {
      if (message.author.bot) continue;
      const createdAt = message.createdAt;
      if (createdAt >= endDate) {
        continue;
      }
      if (createdAt < startDate) {
        return messages;
      }
      messages.push(message);
    }

    pages += 1;
    if (batch.length < 100 || oldest.createdAt < startDate) {
      break;
    }
    lastId = oldest.id;
  }

  return messages;
}

module.exports = {
  name: 'topposter',
  description: 'Show the monthly top posters for a channel based on Discord message history.',
  async execute(target, args) {
    if (!target.guild) return;
    const isInteraction = typeof target.isButton === 'function' || typeof target.isSelectMenu === 'function' || typeof target.isCommand === 'function';
    const member = target.member;
    if (!hasStaffPermission(member)) {
      await target.reply({ embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can use this command.')], ephemeral: isInteraction });
      return;
    }

    const channel = getChannelFromTarget(target, args);
    if (!channel || !channel.isTextBased() || typeof channel.messages?.fetch !== 'function') {
      await target.reply({ embeds: [errorEmbed('Invalid Channel', 'Please mention a valid text channel or provide a channel ID.')], ephemeral: isInteraction });
      return;
    }

    const monthArg = args[1] || null;
    let monthInfo = parseMonth(monthArg);
    if (!monthInfo) {
      const now = new Date();
      monthInfo = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
    }

    if (isInteraction && !target.deferred && !target.replied) {
      await target.deferReply({ ephemeral: true });
    }

    const { startDate, endDate, startISO, endISO } = getMonthRange(monthInfo.year, monthInfo.month);
    const monthLabel = `${monthInfo.year}-${String(monthInfo.month).padStart(2, '0')}`;

    let rows;
    try {
      const rawMessages = await fetchMonthlyMessages(channel, startDate, endDate);
      const aggregate = new Map();

      for (const message of rawMessages) {
        const authorId = message.author.id;
        const existing = aggregate.get(authorId) || {
          author_id: authorId,
          username: message.author.username,
          messages: 0,
          words: 0,
          images: 0,
          attachments: 0,
          links: 0,
        };

        existing.messages += 1;
        existing.words += countWords(message.content);
        existing.images += message.attachments.filter((attachment) => attachment.contentType?.startsWith('image/')).size;
        existing.attachments += message.attachments.size;
        existing.links += countLinks(message.content);
        aggregate.set(authorId, existing);
      }

      rows = Array.from(aggregate.values())
        .sort((a, b) => b.messages - a.messages || b.words - a.words)
        .slice(0, 50);
    } catch (error) {
      await sendInteractionResponse(target, { embeds: [errorEmbed('Unable to Read Messages', `The bot could not read messages from ${channel}. ${error.message}`)], ephemeral: isInteraction });
      return;
    }

    if (!rows || rows.length === 0) {
      await sendInteractionResponse(target, {
        embeds: [warningEmbed('No Data', `No message activity was found in ${channel} for ${monthLabel}.`)],
        ephemeral: isInteraction,
      });
      return;
    }

    const csv = 'Author ID,Username,Messages,Words,Images,Attachments,Links\n' + rows.map((row) => `${row.author_id},${row.username},${row.messages},${row.words || 0},${row.images || 0},${row.attachments || 0},${row.links || 0}`).join('\n');
    const attachment = new AttachmentBuilder(Buffer.from(csv, 'utf8'), { name: `topposter-${monthLabel}.csv` });

    await sendInteractionResponse(target, {
      embeds: [successEmbed('Monthly Top Poster Report', `Top 50 results exported for ${channel} for ${monthLabel}.`)],
      files: [attachment],
      ephemeral: isInteraction,
    });
  },
};
