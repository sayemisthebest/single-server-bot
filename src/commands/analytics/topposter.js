const { AttachmentBuilder } = require('discord.js');
const { db } = require('../../database');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');
const fs = require('fs');
const path = require('path');

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
  return { startISO: startDate.toISOString(), endISO: endDate.toISOString() };
}

function getChannelFromTarget(target, args) {
  if (!target.guild) return null;
  return target.mentions?.channels?.first() || target.guild.channels.cache.get(args[0]);
}

module.exports = {
  name: 'topposter',
  description: 'Show the monthly top posters for a channel.',
  async execute(target, args) {
    if (!target.guild) return;
    const isInteraction = typeof target.isButton === 'function' || typeof target.isSelectMenu === 'function' || typeof target.isCommand === 'function';
    const member = isInteraction ? target.member : target.member;
    if (!hasStaffPermission(member)) {
      await target.reply({ embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can use this command.')], ephemeral: isInteraction });
      return;
    }

    const channel = getChannelFromTarget(target, args);
    if (!channel || !channel.isTextBased()) {
      await target.reply({ embeds: [errorEmbed('Invalid Channel', 'Please mention a valid channel or provide a channel ID.')], ephemeral: isInteraction });
      return;
    }

    const monthArg = args[1] || null;
    let monthInfo = parseMonth(monthArg);
    if (!monthInfo) {
      const now = new Date();
      monthInfo = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
    }

    const { startISO, endISO } = getMonthRange(monthInfo.year, monthInfo.month);
    const rows = db.prepare('SELECT author_id, COUNT(*) as messages, SUM(word_count) as words, SUM(images) as images, SUM(attachments) as attachments, SUM(links) as links FROM analytics WHERE guild_id = ? AND channel_id = ? AND timestamp >= ? AND timestamp < ? GROUP BY author_id ORDER BY messages DESC LIMIT 50').all(target.guild.id, channel.id, startISO, endISO);

    const csv = 'Author ID,Messages,Words,Images,Attachments,Links\n' + rows.map((row) => `${row.author_id},${row.messages},${row.words || 0},${row.images || 0},${row.attachments || 0},${row.links || 0}`).join('\n');
    const outputPath = path.join(__dirname, '..', '..', '..', 'logs', `${isInteraction ? target.id : target.id}-topposter-${monthInfo.year}-${String(monthInfo.month).padStart(2, '0')}.csv`);
    fs.writeFileSync(outputPath, csv, 'utf8');
    const attachment = new AttachmentBuilder(outputPath).setName('topposter.csv');

    const monthLabel = `${monthInfo.year}-${String(monthInfo.month).padStart(2, '0')}`;
    await target.reply({
      embeds: [successEmbed('Monthly Top Poster Report', `Top 50 results exported for ${channel} for ${monthLabel}.`)],
      files: [attachment],
      ephemeral: isInteraction,
    });
  },
};
