const logger = require('../utils/logger');
const { db } = require('../database');

module.exports = async (guild) => {
  db.prepare('INSERT OR IGNORE INTO guild_configs (guild_id, prefix) VALUES (?, ?)').run(guild.id, '!');
  logger.info(`Joined guild: ${guild.name} (${guild.id})`);
};
