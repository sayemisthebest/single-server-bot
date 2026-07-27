const logger = require('../utils/logger');
const { startScheduler } = require('../modules/reminders/scheduler');

module.exports = async (client) => {
  logger.info(`Bot ready as ${client.user.tag}`);
  const activities = [
    { name: 'RHINOMODERATION', type: 0 },
    { name: '!help for commands', type: 2 },
  ];
  client.user.setPresence({ activities, status: 'online' });
  startScheduler(client);
};
