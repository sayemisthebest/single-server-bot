const { EmbedBuilder } = require('discord.js');
const { createAnalyticsButtons, createAnalyticsSecondaryButtons, createNavigationButtons } = require('./components');

function createAnalyticsEmbed() {
  return new EmbedBuilder()
    .setTitle('Analytics')
    .setDescription('Choose an analytics report to generate.')
    .setColor(0x3498db)
    .setTimestamp()
    .setFooter({ text: 'RHINOMODERATION Analytics' });
}

function getAnalyticsComponents() {
  return [createAnalyticsButtons(), createAnalyticsSecondaryButtons(), createNavigationButtons()];
}

module.exports = { createAnalyticsEmbed, getAnalyticsComponents };
