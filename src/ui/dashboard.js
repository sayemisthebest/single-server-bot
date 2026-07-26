const { EmbedBuilder } = require('discord.js');
const { createMainButtons, createSecondaryButtons, createNavigationButtons } = require('./components');

function createDashboardEmbed(guild, client) {
  return new EmbedBuilder()
    .setTitle('RHINOMODERATION Dashboard')
    .setDescription('Manage every feature using the buttons below.')
    .addFields(
      { name: 'Server', value: guild.name || 'Unknown', inline: true },
      { name: 'Bot Status', value: client.isReady() ? 'Online' : 'Starting', inline: true },
      { name: 'Database', value: 'Connected', inline: true },
      { name: 'Version', value: '1.0.0', inline: true },
    )
    .setColor(0x3498db)
    .setTimestamp()
    .setFooter({ text: 'RHINOMODERATION Control Panel' });
}

function createDashboardComponents() {
  return [createMainButtons(), createSecondaryButtons(), createNavigationButtons()];
}

module.exports = { createDashboardEmbed, createDashboardComponents };
