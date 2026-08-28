const { db } = require('../database');

function isTicketChannel(channel, guild) {
  if (!channel || !guild || !channel.topic?.match(/^ticket-owner:\d{17,19}$/)) return false;
  const config = db.prepare('SELECT category_id FROM ticket_configs WHERE guild_id = ?').get(guild.id);
  return Boolean(config?.category_id && channel.parentId === config.category_id);
}

module.exports = { isTicketChannel };