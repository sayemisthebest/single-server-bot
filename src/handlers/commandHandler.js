const { Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { PREFIX } = require('../config/constants');
const { db } = require('../database');

class CommandHandler {
  constructor(client) {
    this.client = client;
    this.commands = new Collection();
    this.loadCommands();
  }

  loadCommands() {
    const commandsDir = path.join(__dirname, '..', 'commands');
    for (const dir of fs.readdirSync(commandsDir)) {
      const dirPath = path.join(commandsDir, dir);
      if (!fs.statSync(dirPath).isDirectory()) continue;
      for (const file of fs.readdirSync(dirPath)) {
        if (!file.endsWith('.js')) continue;
        const command = require(path.join(dirPath, file));
        if (command.name) {
          this.commands.set(command.name, command);
        }
      }
    }
    logger.info(`Loaded ${this.commands.size} commands`);
  }

  async handle(message) {
    if (!message.content.startsWith(PREFIX) || message.author.bot) return;
    if (!message.guild) return;

    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();
    if (!commandName) return;

    const guildConfig = db.prepare('SELECT staff_channel_id FROM guild_configs WHERE guild_id = ?').get(message.guild.id);
    const ticketCommands = new Set(['ticketclose', 'ticketclaim', 'ticketadd', 'ticketremove', 'ticketrename', 'tickettranscript']);
    if (guildConfig?.staff_channel_id && message.channel.id !== guildConfig.staff_channel_id && !ticketCommands.has(commandName)) return;

    const command = this.commands.get(commandName);
    if (!command) return;

    logger.info(`Command executed: ${commandName} by ${message.author.tag} in ${message.guild?.name || 'DM'}`);

    try {
      await command.execute(message, args, this.client);
    } catch (error) {
      logger.error(`Command error: ${error.stack || error.message}`);
      await message.reply({ content: 'An unexpected error occurred while processing the command.' }).catch(() => {});
    }
  }
}

module.exports = CommandHandler;
