const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createNavigationButtons } = require('./components');

function createReminderCenterEmbed() {
  return new EmbedBuilder()
    .setTitle('Reminder Center')
    .setDescription('Manage reminders and scheduled notifications.')
    .setColor(0x9b59b6)
    .setFooter({ text: 'Reminder Management' })
    .setTimestamp();
}

function getReminderCenterComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('reminder_create').setLabel('Create Reminder').setStyle(ButtonStyle.Success).setEmoji('➕'),
      new ButtonBuilder().setCustomId('reminder_view').setLabel('View Reminders').setStyle(ButtonStyle.Primary).setEmoji('📋'),
      new ButtonBuilder().setCustomId('reminder_edit').setLabel('Edit Reminder').setStyle(ButtonStyle.Secondary).setEmoji('✏️'),
      new ButtonBuilder().setCustomId('reminder_delete').setLabel('Delete Reminder').setStyle(ButtonStyle.Danger).setEmoji('🗑'),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('reminder_upcoming').setLabel('Upcoming Reminders').setStyle(ButtonStyle.Primary).setEmoji('📅'),
      new ButtonBuilder().setCustomId('dashboard_back').setLabel('Back').setStyle(ButtonStyle.Secondary).setEmoji('⬅️'),
      new ButtonBuilder().setCustomId('dashboard_close').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('❌'),
    ),
  ];
}

module.exports = { createReminderCenterEmbed, getReminderCenterComponents };
