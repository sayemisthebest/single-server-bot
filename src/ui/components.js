const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType } = require('discord.js');

function createMainButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('dashboard_role_manager').setLabel('Role Manager').setStyle(ButtonStyle.Primary).setEmoji('👥'),
    new ButtonBuilder().setCustomId('dashboard_analytics').setLabel('Analytics').setStyle(ButtonStyle.Secondary).setEmoji('📊'),
    new ButtonBuilder().setCustomId('dashboard_ticket_system').setLabel('Ticket System').setStyle(ButtonStyle.Success).setEmoji('🎫'),
  );
}

function createSecondaryButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('dashboard_settings').setLabel('Settings').setStyle(ButtonStyle.Secondary).setEmoji('⚙️'),
    new ButtonBuilder().setCustomId('dashboard_exports').setLabel('Exports').setStyle(ButtonStyle.Primary).setEmoji('📁'),
    new ButtonBuilder().setCustomId('dashboard_help').setLabel('Help').setStyle(ButtonStyle.Success).setEmoji('❓'),
  );
}

function createNavigationButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('dashboard_home').setLabel('Home').setStyle(ButtonStyle.Secondary).setEmoji('🏠'),
    new ButtonBuilder().setCustomId('dashboard_back').setLabel('Back').setStyle(ButtonStyle.Secondary).setEmoji('⬅️'),
    new ButtonBuilder().setCustomId('dashboard_close').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('❌'),
  );
}

function createRoleManagerButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('role_add').setLabel('Add Role').setStyle(ButtonStyle.Success).setEmoji('➕'),
    new ButtonBuilder().setCustomId('role_remove').setLabel('Remove Role').setStyle(ButtonStyle.Danger).setEmoji('➖'),
    new ButtonBuilder().setCustomId('role_export').setLabel('Export Role').setStyle(ButtonStyle.Primary).setEmoji('📄'),
  );
}

function createAnalyticsButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('analytics_reaction').setLabel('Reaction List').setStyle(ButtonStyle.Primary).setEmoji('🔵'),
    new ButtonBuilder().setCustomId('analytics_afterpost').setLabel('After Post').setStyle(ButtonStyle.Success).setEmoji('🟢'),
    new ButtonBuilder().setCustomId('analytics_topposter').setLabel('Monthly Top Poster').setStyle(ButtonStyle.Secondary).setEmoji('🟣'),
    new ButtonBuilder().setCustomId('analytics_nonreactors').setLabel('Nonreactors').setStyle(ButtonStyle.Secondary).setEmoji('🚫'),
  );
}

function createTicketButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_create_panel').setLabel('Create Ticket Panel').setStyle(ButtonStyle.Primary).setEmoji('🛠️'),
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
    new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim Ticket').setStyle(ButtonStyle.Success).setEmoji('🏷️'),
  );
}

function createTicketSecondaryButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_transcript').setLabel('Transcript').setStyle(ButtonStyle.Primary).setEmoji('🧾'),
    new ButtonBuilder().setCustomId('ticket_settings').setLabel('Settings').setStyle(ButtonStyle.Secondary).setEmoji('⚙️'),
  );
}

function createSettingsButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('settings_staff_channel').setLabel('Staff Channel').setStyle(ButtonStyle.Primary).setEmoji('👥'),
    new ButtonBuilder().setCustomId('settings_logs_channel').setLabel('Logs Channel').setStyle(ButtonStyle.Secondary).setEmoji('🧾'),
    new ButtonBuilder().setCustomId('settings_ticket_category').setLabel('Ticket Category').setStyle(ButtonStyle.Success).setEmoji('📂'),
  );
}

function createSettingsSecondaryButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('settings_backup_db').setLabel('Backup Database').setStyle(ButtonStyle.Primary).setEmoji('💾'),
    new ButtonBuilder().setCustomId('settings_reset_config').setLabel('Reset Config').setStyle(ButtonStyle.Danger).setEmoji('⚠️'),
  );
}

function createExportButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('export_role').setLabel('Export Role').setStyle(ButtonStyle.Primary).setEmoji('📄'),
    new ButtonBuilder().setCustomId('export_analytics').setLabel('Export Analytics').setStyle(ButtonStyle.Secondary).setEmoji('📊'),
    new ButtonBuilder().setCustomId('export_tickets').setLabel('Export Tickets').setStyle(ButtonStyle.Success).setEmoji('🎫'),
  );
}

function createLogsExportButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('export_logs').setLabel('Export Logs').setStyle(ButtonStyle.Primary).setEmoji('🗂️'),
  );
}

function createRoleSelect(customId) {
  return new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder('Select a role')
      .setMinValues(1)
      .setMaxValues(1),
  );
}

function createChannelSelect(customId, placeholder, channelTypes) {
  return new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder)
      .setChannelTypes(channelTypes),
  );
}

function createMonthSelect(customId, placeholder, monthOptions) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder)
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(monthOptions),
  );
}

function createModal(customId, title, label, placeholder, customIdField = 'input') {
  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(title)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(customIdField)
          .setLabel(label)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder(placeholder)
          .setRequired(true),
      ),
    );
}

function disableComponents(components) {
  return components.map((row) => {
    const newRow = ActionRowBuilder.from(row);
    newRow.components = newRow.components.map((component) => component.setDisabled(true));
    return newRow;
  });
}

module.exports = {
  createMainButtons,
  createSecondaryButtons,
  createNavigationButtons,
  createRoleManagerButtons,
  createAnalyticsButtons,
  createTicketButtons,
  createTicketSecondaryButtons,
  createSettingsButtons,
  createSettingsSecondaryButtons,
  createExportButtons,
  createLogsExportButton,
  createRoleSelect,
  createChannelSelect,
  createModal,
  disableComponents,
};
