const { db } = require('../database');
const { PREFIX } = require('../config/constants');

module.exports = async (client, message) => {
  if (!message.guild || message.author.bot) return;

  const guildConfig = db.prepare('SELECT staff_channel_id FROM guild_configs WHERE guild_id = ?').get(message.guild.id);
  if (guildConfig?.staff_channel_id && message.channel.id !== guildConfig.staff_channel_id) {
    if (message.content.startsWith(PREFIX)) {
      return;
    }
  }
};
