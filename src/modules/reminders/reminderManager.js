const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { errorEmbed, infoEmbed } = require('../../utils/embeds');
const { getGuildReminders, getUpcomingReminders } = require('./database');

const REMINDER_TYPES = [
  { label: 'Personal Reminder', value: 'personal' },
  { label: 'DM Reminder', value: 'dm' },
  { label: 'Channel Reminder', value: 'channel' },
  { label: 'Role Reminder', value: 'role' },
];

const REPEAT_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
  { label: 'Custom Interval', value: 'custom' },
];

function parseDeliveryTimestamp(value) {
  const normalized = value.trim();
  const isoMatch = normalized.match(/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)?$/);
  if (isoMatch) {
    const date = new Date(normalized);
    if (!Number.isNaN(date.getTime())) {
      return date.getTime();
    }
  }

  const fallback = new Date(normalized);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback.getTime();
  }

  const parts = normalized.split(' ');
  if (parts.length >= 2) {
    const datePart = parts[0];
    const timePart = parts[1];
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    if ([year, month, day, hour, minute].every((n) => Number.isInteger(n))) {
      const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
      if (!Number.isNaN(date.getTime())) {
        return date.getTime();
      }
    }
  }

  return null;
}

function formatTimestamp(timestamp) {
  if (!timestamp) return 'Unknown';
  return new Date(timestamp).toUTCString();
}

function buildReminderPreviewEmbed(data, author) {
  const embed = new EmbedBuilder()
    .setTitle('Reminder Preview')
    .setDescription(data.message || '_No message provided._')
    .setColor(0x9b59b6)
    .addFields(
      { name: 'Creator', value: author.tag, inline: true },
      { name: 'Type', value: data.type, inline: true },
      { name: 'Title', value: data.title || '_No title provided_', inline: true },
      { name: 'Delivery', value: formatTimestamp(data.delivery_timestamp), inline: true },
      { name: 'Repeat', value: data.repeat_type || 'none', inline: true },
      { name: 'Recipient', value: data.recipient_label || 'Creator', inline: true },
    )
    .setTimestamp();

  if (data.metadata?.attachments?.length) {
    embed.addFields({ name: 'Attachments', value: `${data.metadata.attachments.length} file(s)`, inline: true });
  }

  return embed;
}

function collectAttachmentMetadata(message) {
  const attachments = [];
  for (const attachment of message.attachments.values()) {
    attachments.push({
      id: attachment.id,
      name: attachment.name,
      url: attachment.url,
      contentType: attachment.contentType || null,
      size: attachment.size,
    });
  }
  return attachments;
}

function buildReminderListEmbed(guildId, page = 1) {
  const limit = 5;
  const offset = (page - 1) * limit;
  const reminders = getGuildReminders(guildId, offset, limit);
  const embed = new EmbedBuilder()
    .setTitle('Reminder List')
    .setDescription(`Page ${page} — Showing up to ${limit} reminders.`)
    .setColor(0x9b59b6)
    .setTimestamp();

  if (!reminders.length) {
    embed.setDescription('No reminders found. Use Create Reminder to add one.');
    return embed;
  }

  reminders.forEach((reminder) => {
    embed.addFields({
      name: `${reminder.id}: ${reminder.title}`,
      value: `Type: ${reminder.type}
Recipient: ${reminder.recipient_user_id || reminder.recipient_role_id || reminder.recipient_channel_id || 'Creator'}
Next Run: ${formatTimestamp(reminder.next_run)}
Repeat: ${reminder.repeat_type || 'none'}
Status: ${reminder.status}`,
    });
  });

  return embed;
}

function buildUpcomingEmbed(guildId) {
  const now = Date.now();
  const day = now + 24 * 60 * 60 * 1000;
  const week = now + 7 * 24 * 60 * 60 * 1000;
  const upcoming = getUpcomingReminders(guildId, week);
  const today = upcoming.filter((reminder) => reminder.next_run <= day);
  const next7 = upcoming.filter((reminder) => reminder.next_run > day);
  const embed = new EmbedBuilder()
    .setTitle('Upcoming Reminders')
    .setDescription('Reminders due today, within 24 hours, and within 7 days.')
    .setColor(0x9b59b6)
    .setTimestamp();
  if (!upcoming.length) {
    embed.setDescription('No upcoming reminders found.');
    return embed;
  }

  if (today.length) {
    embed.addFields({ name: 'Today / Next 24h', value: today.map((reminder) => `${reminder.id}: ${reminder.title} — ${formatTimestamp(reminder.next_run)}`).join('\n') });
  }

  if (next7.length) {
    embed.addFields({ name: 'Next 7 Days', value: next7.map((reminder) => `${reminder.id}: ${reminder.title} — ${formatTimestamp(reminder.next_run)}`).join('\n') });
  }

  return embed;
}

function createReminderPaginationComponents(page) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('reminder_view_prev').setLabel('Previous Page').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('reminder_view_next').setLabel('Next Page').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('reminder_view_edit').setLabel('Edit').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('reminder_view_delete').setLabel('Delete').setStyle(ButtonStyle.Danger),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('dashboard_back').setLabel('Back').setStyle(ButtonStyle.Secondary).setEmoji('⬅️'),
      new ButtonBuilder().setCustomId('dashboard_close').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('❌'),
    ),
  ];
}

module.exports = {
  REMINDER_TYPES,
  REPEAT_OPTIONS,
  parseDeliveryTimestamp,
  formatTimestamp,
  buildReminderPreviewEmbed,
  collectAttachmentMetadata,
  buildReminderListEmbed,
  buildUpcomingEmbed,
  createReminderPaginationComponents,
  errorEmbed,
  infoEmbed,
  getReminderSelectionOptions: (reminders) => reminders.map((reminder) => ({ label: `${reminder.id}: ${reminder.title}`, value: String(reminder.id) })),
};
