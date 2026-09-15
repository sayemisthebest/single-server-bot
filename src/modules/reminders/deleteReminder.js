const { deleteReminder, deleteReminders, getReminderById } = require('./database');
const { MessageFlags } = require('discord.js');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');

async function handleDeleteReminder(interaction) {
  const session = interaction.client.dashboardHandler.getSession(interaction.user.id);
  if (!interaction.guild || !session) return;
  if (!hasStaffPermission(interaction.member)) {
    await interaction.reply({ embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can use this module.')], flags: MessageFlags.Ephemeral });
    return;
  }

  const [_, id] = interaction.customId.split(':');
  const reminder = getReminderById(Number(id));
  if (!reminder) {
    await interaction.reply({ embeds: [errorEmbed('Reminder Not Found', 'The selected reminder does not exist.')], flags: MessageFlags.Ephemeral });
    return;
  }

  session.followUp = { type: 'reminder_delete_confirm', reminderId: reminder.id };
  await interaction.reply({ embeds: [infoEmbed('Delete Reminder', `Are you sure you want to delete reminder ${reminder.id} — ${reminder.title}?`)], components: [
    new (require('discord.js').ActionRowBuilder)().addComponents(
      new (require('discord.js').ButtonBuilder)().setCustomId(`reminder_delete_yes:${reminder.id}`).setLabel('Yes').setStyle(require('discord.js').ButtonStyle.Danger),
      new (require('discord.js').ButtonBuilder)().setCustomId('reminder_delete_no').setLabel('No').setStyle(require('discord.js').ButtonStyle.Secondary),
    ),
  ], flags: MessageFlags.Ephemeral });
}

async function confirmDelete(interaction) {
  const session = interaction.client.dashboardHandler.getSession(interaction.user.id);
  if (!interaction.guild || !session) return;
  if (!hasStaffPermission(interaction.member)) {
    await interaction.reply({ embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can use this module.')], flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.customId === 'reminder_delete_no') {
    session.followUp = null;
    await interaction.reply({ embeds: [successEmbed('Canceled', 'Reminder deletion was canceled.')], flags: MessageFlags.Ephemeral });
    return;
  }

  const id = Number(interaction.customId.split(':')[1]);
  deleteReminder(id);
  session.followUp = null;
  await interaction.reply({ embeds: [successEmbed('Deleted', `Reminder ${id} has been deleted.`)], flags: MessageFlags.Ephemeral });
}

module.exports = { handleDeleteReminder, confirmDelete };
