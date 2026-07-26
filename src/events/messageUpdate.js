const { db } = require('../database');

module.exports = async (oldMessage, newMessage) => {
  if (!newMessage.guild || oldMessage.content === newMessage.content) return;

  db.prepare('UPDATE message_logs SET edited = 1 WHERE message_id = ? AND guild_id = ?').run(newMessage.id, newMessage.guild.id);
};
