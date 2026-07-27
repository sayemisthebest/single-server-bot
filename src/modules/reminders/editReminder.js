const { getReminderById, updateReminder } = require('./database');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');

async function handleEditReminder(interaction) {
  const session = interaction.client.dashboardHandler.getSession(interaction.user.id);
  if (!interaction.guild || !session) return;
  if (!hasStaffPermission(interaction.member)) {
    await interaction.reply({ embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can use this module.')], ephemeral: true });
    return;
  }

  const [id] = interaction.customId.split(':').slice(1);
  const reminder = getReminderById(Number(id));
  if (!reminder) {
    await interaction.reply({ embeds: [errorEmbed('Reminder Not Found', 'The selected reminder does not exist.')], ephemeral: true });
    return;
  }

  session.followUp = { type: 'reminder_edit', reminderId: reminder.id };
  await interaction.reply({ embeds: [infoEmbed('Edit Reminder', `Send the updated reminder title, message, attachments, or use the dashboard to adjust date and repeat settings.`)], ephemeral: true });
}

module.exports = { handleEditReminder };
