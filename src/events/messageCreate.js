const { db } = require('../database');
const logger = require('../utils/logger');
const { PREFIX } = require('../config/constants');

module.exports = async (client, message) => {
  if (!message.guild || message.author.bot) return;

  const guildConfig = db.prepare('SELECT staff_channel_id FROM guild_configs WHERE guild_id = ?').get(message.guild.id);
  if (guildConfig?.staff_channel_id && message.channel.id !== guildConfig.staff_channel_id) {
    if (message.content.startsWith(PREFIX)) {
      return;
    }
  }

  const words = message.content.trim().split(/\s+/).filter(Boolean).length;
  const attachments = message.attachments.size;
  const imageCount = message.attachments.filter((a) => a.contentType?.startsWith('image/')).size;
  const linkCount = (message.content.match(/https?:\/\/[^\s]+/g) || []).length;

  db.prepare(`
    INSERT INTO message_logs (guild_id, channel_id, message_id, author_id, timestamp, word_count, attachments, images, links, edited, deleted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    message.guild.id,
    message.channel.id,
    message.id,
    message.author.id,
    message.createdAt.toISOString(),
    words,
    attachments,
    imageCount,
    linkCount,
    0,
    0
  );

  db.prepare(`
    INSERT INTO analytics (guild_id, channel_id, author_id, message_id, timestamp, attachment_count, image_count, link_count, word_count, message_length)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    message.guild.id,
    message.channel.id,
    message.author.id,
    message.id,
    message.createdAt.toISOString(),
    attachments,
    imageCount,
    linkCount,
    words,
    message.content.length
  );

  logger.info(`Message logged: ${message.id}`);
};
