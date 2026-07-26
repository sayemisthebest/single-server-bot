const { EmbedBuilder } = require('discord.js');
const { createExportButtons, createLogsExportButton, createNavigationButtons } = require('./components');

function createExportEmbed() {
  return new EmbedBuilder()
    .setTitle('Exports')
    .setDescription('Export roles, analytics, tickets, or logs as CSV files.')
    .setColor(0x1abc9c)
    .setTimestamp()
    .setFooter({ text: 'RHINOMODERATION Exports' });
}

function getExportComponents() {
  return [createExportButtons(), createLogsExportButton(), createNavigationButtons()];
}

module.exports = { createExportEmbed, getExportComponents };
