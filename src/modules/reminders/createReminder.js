const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, StringSelectMenuBuilder, MessageFlags } = require('discord.js');
const { createNavigationButtons, createChannelSelect, createRoleSelect } = require('../../ui/components');
const { infoEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');
const { getReminderById, createReminder } = require('./database');
const logger = require('../../utils/logger');

const REMINDER_TYPES = [
  { label: 'Personal Reminder', value: 'personal' },
  { label: 'DM Reminder', value: 'dm' },
  { label: 'Channel Reminder', value: 'channel' },
  { label: 'Role Reminder', value: 'role' },
];

function createReminderEmbed(user, step, state) {
  const embed = new (require('discord.js').EmbedBuilder)()
    .setTitle('Create Reminder')
    .setDescription(`Step ${step}/7 — ${state}`)
    .setColor(0x9b59b6)
    .setTimestamp();

  if (step >= 2 && state) {
    embed.addFields({ name: 'Current Selection', value: state, inline: false });
  }

  return embed;
}

async function handleReminderCreate(interaction) {
  const user = interaction.user;
  if (!interaction.guild) return;
  if (!hasStaffPermission(interaction.member)) {
    await interaction.reply({ embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can use this module.')], flags: MessageFlags.Ephemeral });
    return;
  }

  const guildConfig = require('../../database').db.prepare('SELECT staff_channel_id FROM guild_configs WHERE guild_id = ?').get(interaction.guild.id);
  if (guildConfig?.staff_channel_id && interaction.channel.id !== guildConfig.staff_channel_id) {
    await interaction.reply({ embeds: [errorEmbed('Staff Channel Only', 'Reminder management commands must be used in the private staff channel.')], flags: MessageFlags.Ephemeral });
    return;
  }

  const actionRow = new ActionRowBuilder().addComponents(
    ...REMINDER_TYPES.map((item) => new ButtonBuilder().setCustomId(`reminder_type_${item.value}`).setLabel(item.label).setStyle(ButtonStyle.Primary)),
  );
  await interaction.update({ embeds: [createReminderEmbed(user, 1, 'Choose reminder type')], components: [actionRow, createNavigationButtons()] });
}

module.exports = { handleReminderCreate, createReminderEmbed };
