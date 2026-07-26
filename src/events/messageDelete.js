const { db } = require('../database');

module.exports = async (message) => {
  if (!message.guild) return;
  db.prepare('UPDATE message_logs SET deleted = 1 WHERE message_id = ? AND guild_id = ?').run(message.id, message.guild.id);
};
