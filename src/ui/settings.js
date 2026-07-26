const { EmbedBuilder } = require('discord.js');
const { createSettingsButtons, createSettingsSecondaryButtons, createNavigationButtons } = require('./components');

function createSettingsEmbed() {
  return new EmbedBuilder()
    .setTitle('Settings')
    .setDescription('Configure staff, logs, ticket categories, and database options.')
    .setColor(0xf39c12)
    .setTimestamp()
    .setFooter({ text: 'RHINOMODERATION Settings' });
}

function getSettingsComponents() {
  return [createSettingsButtons(), createSettingsSecondaryButtons(), createNavigationButtons()];
}

module.exports = { createSettingsEmbed, getSettingsComponents };
