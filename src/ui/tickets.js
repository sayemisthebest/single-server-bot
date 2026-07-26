const { EmbedBuilder } = require('discord.js');
const { createTicketButtons, createTicketSecondaryButtons, createNavigationButtons } = require('./components');

function createTicketEmbed() {
  return new EmbedBuilder()
    .setTitle('Ticket System')
    .setDescription('Manage the ticket system and transcript functions.')
    .setColor(0x9b59b6)
    .setTimestamp()
    .setFooter({ text: 'RHINOMODERATION Ticket System' });
}

function getTicketComponents() {
  return [createTicketButtons(), createTicketSecondaryButtons(), createNavigationButtons()];
}

module.exports = { createTicketEmbed, getTicketComponents };
