const { AttachmentBuilder } = require('discord.js');
const { db } = require('../../database');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'topposter',
  description: 'Show the monthly top posters for a channel.',
  async execute(message, args) {
    if (!message.guild) return;
    if (!hasStaffPermission(message.member)) {
      await message.reply({ embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can use this command.')] });
      return;
    }

    const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
    if (!channel) {
      await message.reply({ embeds: [errorEmbed('Invalid Channel', 'Please mention a valid channel or provide a channel ID.')] });
      return;
    }

    const rows = db.prepare('SELECT author_id, COUNT(*) as messages, SUM(word_count) as words, SUM(images) as images, SUM(attachments) as attachments, SUM(links) as links FROM analytics WHERE guild_id = ? AND channel_id = ? GROUP BY author_id ORDER BY messages DESC LIMIT 50').all(message.guild.id, channel.id);
    const csv = 'Author ID,Messages,Words,Images,Attachments,Links\n' + rows.map((row) => `${row.author_id},${row.messages},${row.words || 0},${row.images || 0},${row.attachments || 0},${row.links || 0}`).join('\n');
    const outputPath = path.join(__dirname, '..', '..', '..', 'logs', `${message.id}-topposter.csv`);
    fs.writeFileSync(outputPath, csv, 'utf8');
    const attachment = new AttachmentBuilder(outputPath).setName('topposter.csv');

    await message.reply({
      embeds: [successEmbed('Monthly Top Poster Report', `Top 50 results exported for ${channel}.`)],
      files: [attachment],
    });
  },
};
