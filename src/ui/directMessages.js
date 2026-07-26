const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createNavigationButtons } = require('./components');

function createDirectMessagesEmbed() {
  return new EmbedBuilder()
    .setTitle('Direct Message Manager')
    .setDescription('Send a direct message to one user or broadcast a message to multiple recipients.')
    .setColor(0x1abc9c)
    .setTimestamp()
    .setFooter({ text: 'RHINOMODERATION Direct Messages' });
}

function getDirectMessageComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('dm_single').setLabel('Single DM').setStyle(ButtonStyle.Primary).setEmoji('✉️'),
      new ButtonBuilder().setCustomId('dm_mass').setLabel('Mass DM').setStyle(ButtonStyle.Secondary).setEmoji('📢'),
    ),
    createNavigationButtons(),
  ];
}

module.exports = { createDirectMessagesEmbed, getDirectMessageComponents };
