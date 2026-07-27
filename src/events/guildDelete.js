const logger = require('../utils/logger');
const { db } = require('../database');

module.exports = async (guild) => {
  db.prepare('DELETE FROM guild_configs WHERE guild_id = ?').run(guild.id);
  db.prepare('DELETE FROM ticket_configs WHERE guild_id = ?').run(guild.id);
  db.prepare('DELETE FROM ticket_daily_counts WHERE guild_id = ?').run(guild.id);
  logger.info(`Left guild: ${guild.name} (${guild.id})`);
};
