const { EmbedBuilder } = require('discord.js');
const { db } = require('../../database');
const logger = require('../../utils/logger');

async function sendDeletionLog(guild, executor, targetChannel, targetUser, requestedCount, deletedCount, skippedCount) {
  const guildConfig = db.prepare('SELECT staff_channel_id FROM guild_configs WHERE guild_id = ?').get(guild.id);
  const ticketConfig = db.prepare('SELECT logs_id FROM ticket_configs WHERE guild_id = ?').get(guild.id);
  const logChannelId = ticketConfig?.logs_id || guildConfig?.staff_channel_id;
  if (!logChannelId) return;

  const logChannel = guild.channels.cache.get(logChannelId);
  if (!logChannel?.isTextBased()) return;

  const executorTag = executor?.user?.tag || executor?.tag || 'Unknown Executor';
  const executorId = executor?.user?.id || executor?.id || 'unknown';
  const targetUserTag = targetUser ? (targetUser.tag || targetUser.user?.tag || 'Unknown User') : 'All recent messages';
  const targetUserId = targetUser ? (targetUser.id || targetUser.user?.id || 'unknown') : '';

  const embed = new EmbedBuilder()
    .setTitle('Message Deletion Log')
    .setColor(0xe74c3c)
    .addFields(
      { name: 'Administrator', value: `${executorTag} (${executorId})`, inline: false },
      { name: 'Guild', value: `${guild.name} (${guild.id})`, inline: false },
      { name: 'Channel', value: `${targetChannel?.toString() || 'Unknown'} (${targetChannel?.id || 'unknown'})`, inline: false },
      { name: 'Target User', value: targetUser ? `${targetUserTag} (${targetUserId})` : 'All recent messages', inline: false },
      { name: 'Target User', value: targetUser ? `${targetUser.tag} (${targetUser.id})` : 'All recent messages', inline: false },
      { name: 'Requested Count', value: `${requestedCount}`, inline: true },
      { name: 'Deleted Count', value: `${deletedCount}`, inline: true },
      { name: 'Skipped Count', value: `${skippedCount}`, inline: true },
      { name: 'Time', value: new Date().toISOString(), inline: false },
    )
    .setTimestamp();

  try {
    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    logger.warn(`Failed to send deletion log: ${error.message}`);
  }
}

module.exports = { sendDeletionLog };
