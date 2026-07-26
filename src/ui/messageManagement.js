const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createNavigationButtons } = require('./components');

function createMessageManagementEmbed() {
  return new EmbedBuilder()
    .setTitle('Message Management')
    .setDescription('Choose what you want to delete from channels or users.')
    .setColor(0xe74c3c)
    .setTimestamp()
    .setFooter({ text: 'RHINOMODERATION Message Management' });
}

function getMessageManagementComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('mm_delete_recent').setLabel('Delete Recent Messages').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
      new ButtonBuilder().setCustomId('mm_delete_user').setLabel('Delete Specific User Messages').setStyle(ButtonStyle.Secondary).setEmoji('👤'),
    ),
    createNavigationButtons(),
  ];
}

function createDeleteConfirmComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('mm_confirm_delete').setLabel('Confirm').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('mm_cancel_delete').setLabel('Cancel').setStyle(ButtonStyle.Danger),
    ),
  ];
}

module.exports = { createMessageManagementEmbed, getMessageManagementComponents, createDeleteConfirmComponents };
