require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const CommandHandler = require('./handlers/commandHandler');
const logger = require('./utils/logger');
const { db } = require('./database');
const { PREFIX } = require('./config/constants');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

const commandHandler = new CommandHandler(client);
const DashboardHandler = require('./handlers/dashboardHandler');
client.dashboardHandler = new DashboardHandler(client);
const messageManager = require('./modules/messageManagement');
client.messageManager = messageManager;

client.once('clientReady', async () => {
  logger.info('Bot Ready');
  const readyModule = require('./events/ready');
  await readyModule(client);
});

client.on('guildCreate', async (guild) => {
  const guildCreateModule = require('./events/guildCreate');
  await guildCreateModule(guild);
});

client.on('guildDelete', async (guild) => {
  const guildDeleteModule = require('./events/guildDelete');
  await guildDeleteModule(guild);
});

client.on('messageCreate', async (message) => {
  const messageCreateModule = require('./events/messageCreate');
  await messageCreateModule(client, message);
  if (!message.author.bot) {
    await client.dashboardHandler.handleFollowUpMessage(message);
    await client.messageManager.handleFollowUpMessage(message);
  }
  if (message.content.startsWith(PREFIX) && !message.author.bot) {
    await commandHandler.handle(message);
  }
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
  const messageUpdateModule = require('./events/messageUpdate');
  await messageUpdateModule(oldMessage, newMessage);
});

client.on('messageDelete', async (message) => {
  const messageDeleteModule = require('./events/messageDelete');
  await messageDeleteModule(message);
});

client.on('interactionCreate', async (interaction) => {
  const interactionModule = require('./events/interactionCreate');
  await interactionModule(client, interaction);
});

client.login(process.env.TOKEN).catch((error) => {
  logger.error(error.stack || error.message);
  process.exit(1);
});
