const { createDashboardEmbed, createDashboardComponents } = require('../ui/dashboard');
const { createReminderCenterEmbed, getReminderCenterComponents } = require('../ui/reminders');
const { createRoleManagerEmbed, getRoleManagerComponents } = require('../ui/roleManager');
const { createAnalyticsEmbed, getAnalyticsComponents } = require('../ui/analytics');
const { createTicketEmbed, getTicketComponents } = require('../ui/tickets');
const { createSettingsEmbed, getSettingsComponents } = require('../ui/settings');
const { createExportEmbed, getExportComponents } = require('../ui/exports');
const { createHelpEmbed, getHelpComponents } = require('../ui/help');
const { createDirectMessagesEmbed, getDirectMessageComponents } = require('../ui/directMessages');
const { createMessageManagementEmbed, getMessageManagementComponents } = require('../ui/messageManagement');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder } = require('discord.js');
const { hasStaffPermission } = require('../utils/permissions');
const { db } = require('../database');
const { errorEmbed, infoEmbed, successEmbed } = require('../utils/embeds');
const { PREFIX } = require('../config/constants');
const dmManager = require('../modules/directMessages/dmManager');
const messageManager = require('../modules/messageManagement/messageManager');
const reminderManager = require('../modules/reminders/reminderManager');
const reminderDatabase = require('../modules/reminders/database');
const reminderCreate = require('../modules/reminders/createReminder');
const { createReminderEmbed } = reminderCreate;
const reminderEdit = require('../modules/reminders/editReminder');
const reminderDelete = require('../modules/reminders/deleteReminder');
const logger = require('../utils/logger');

class DashboardHandler {
  constructor(client) {
    this.client = client;
    this.sessions = new Map();
    this.sessionTimeouts = new Map();
  }

  async launchDashboard(message) {
    if (!message.guild) return;
    if (!hasStaffPermission(message.member)) {
      await message.reply({ embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can access the dashboard.')] });
      return;
    }

    const embed = createDashboardEmbed(message.guild, this.client);
    const components = createDashboardComponents();
    const panel = await message.reply({ embeds: [embed], components });
    this.startSession(message.author.id, panel.id, message.channel.id, message.guild.id);
  }

  async launchReminderCenter(message) {
    if (!message.guild) return;
    if (!hasStaffPermission(message.member)) {
      await message.reply({ embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can access the reminder center.')] });
      return;
    }

    const guildConfig = db.prepare('SELECT staff_channel_id FROM guild_configs WHERE guild_id = ?').get(message.guild.id);
    if (guildConfig?.staff_channel_id && message.channel.id !== guildConfig.staff_channel_id) {
      await message.reply({ embeds: [errorEmbed('Staff Channel Only', 'The reminder center must be opened in the configured private staff channel.')] });
      return;
    }

    const embed = createReminderCenterEmbed();
    const components = getReminderCenterComponents();
    const panel = await message.reply({ embeds: [embed], components });
    this.startSession(message.author.id, panel.id, message.channel.id, message.guild.id);
  }

  startSession(userId, messageId, channelId, guildId) {
    const session = {
      userId,
      messageId,
      channelId,
      guildId,
      lastInteraction: Date.now(),
      state: 'dashboard',
    };
    this.sessions.set(userId, session);
    if (this.sessionTimeouts.has(userId)) {
      clearTimeout(this.sessionTimeouts.get(userId));
    }
    this.sessionTimeouts.set(userId, setTimeout(() => this.expireSession(userId), 300000));
  }

  expireSession(userId) {
    const session = this.sessions.get(userId);
    if (!session) return;
    if (Date.now() - session.lastInteraction >= 300000) {
      this.sessions.delete(userId);
    }
    if (this.sessionTimeouts.has(userId)) {
      clearTimeout(this.sessionTimeouts.get(userId));
      this.sessionTimeouts.delete(userId);
    }
  }

  getSession(userId) {
    return this.sessions.get(userId);
  }

  updateSession(userId) {
    const session = this.sessions.get(userId);
    if (!session) return;
    session.lastInteraction = Date.now();
    if (this.sessionTimeouts.has(userId)) {
      clearTimeout(this.sessionTimeouts.get(userId));
    }
    this.sessionTimeouts.set(userId, setTimeout(() => this.expireSession(userId), 300000));
  }

  async handleInteraction(interaction) {
    const session = this.getSession(interaction.user.id);
    if (!session || session.guildId !== interaction.guild.id) {
      return false;
    }

    this.updateSession(interaction.user.id);

    switch (interaction.customId) {
      case 'dashboard_role_manager':
        await interaction.update({ embeds: [createRoleManagerEmbed()], components: getRoleManagerComponents(interaction.guild) });
        return true;
      case 'dashboard_analytics':
        await interaction.update({ embeds: [createAnalyticsEmbed()], components: getAnalyticsComponents() });
        return true;
      case 'dashboard_ticket_system':
        await interaction.update({ embeds: [createTicketEmbed()], components: getTicketComponents() });
        return true;
      case 'dashboard_settings':
        await interaction.update({ embeds: [createSettingsEmbed()], components: getSettingsComponents() });
        return true;
      case 'dashboard_exports':
        await interaction.update({ embeds: [createExportEmbed()], components: getExportComponents() });
        return true;
      case 'dashboard_help':
        await interaction.update({ embeds: [createHelpEmbed()], components: getHelpComponents() });
        return true;
      case 'dashboard_direct_messages':
        await interaction.update({ embeds: [createDirectMessagesEmbed()], components: getDirectMessageComponents() });
        return true;
      case 'dashboard_message_management':
        await interaction.update({ embeds: [createMessageManagementEmbed()], components: getMessageManagementComponents() });
        return true;
      case 'dashboard_reminders':
        await interaction.update({ embeds: [createReminderCenterEmbed()], components: getReminderCenterComponents() });
        return true;
      case 'dashboard_home':
        if (session.followUp) delete session.followUp;
        await interaction.update({ embeds: [createDashboardEmbed(interaction.guild, this.client)], components: createDashboardComponents() });
        return true;
      case 'dashboard_back':
        if (session.followUp) delete session.followUp;
        await interaction.update({ embeds: [createDashboardEmbed(interaction.guild, this.client)], components: createDashboardComponents() });
        return true;
      case 'dashboard_close':
        if (session.followUp) delete session.followUp;
        await interaction.update({ embeds: [errorEmbed('Dashboard Closed', 'The dashboard session has been closed.')], components: [] });
        this.sessions.delete(interaction.user.id);
        return true;
      case 'role_add':
        await this.handleRoleAdd(interaction);
        return true;
      case 'role_remove':
        await this.handleRoleRemove(interaction);
        return true;
      case 'role_export':
        await this.handleRoleExport(interaction);
        return true;
      case 'analytics_reaction':
        await this.handleAnalyticsReaction(interaction);
        return true;
      case 'analytics_afterpost':
        await this.handleAnalyticsAfterPost(interaction);
        return true;
      case 'analytics_topposter':
        await this.handleAnalyticsTopPoster(interaction);
        return true;
      case 'analytics_nonreactors':
        await this.handleAnalyticsNonReactors(interaction);
        return true;
      case 'ticket_create_panel':
        await this.handleTicketCreatePanel(interaction);
        return true;
      case 'ticket_close':
        await this.handleTicketClose(interaction);
        return true;
      case 'ticket_claim':
        await this.handleTicketClaim(interaction);
        return true;
      case 'ticket_transcript':
        await this.handleTicketTranscript(interaction);
        return true;
      case 'ticket_settings':
        await this.handleTicketSettings(interaction);
        return true;
      case 'dm_single':
        await this.handleDirectMessageSingle(interaction);
        return true;
      case 'dm_mass':
        await this.handleDirectMessageMass(interaction);
        return true;
      case 'dm_confirm':
        await this.handleDirectMessageConfirm(interaction);
        return true;
      case 'dm_cancel':
        await this.handleDirectMessageCancel(interaction);
        return true;
      case 'dashboard_reminders':
        await this.handleReminderCenter(interaction);
        return true;
      case 'reminder_create':
        await this.handleReminderCreate(interaction);
        return true;
      case 'reminder_type_personal':
      case 'reminder_type_dm':
      case 'reminder_type_channel':
      case 'reminder_type_role':
        await this.handleReminderTypeSelection(interaction);
        return true;
      case 'reminder_view':
        await this.handleReminderView(interaction);
        return true;
      case 'reminder_edit':
        await this.handleReminderEdit(interaction);
        return true;
      case 'reminder_delete':
        await this.handleReminderDelete(interaction);
        return true;
      case 'reminder_delete_yes':
      case 'reminder_delete_no':
        await reminderDelete.confirmDelete(interaction);
        return true;
      case 'reminder_upcoming':
        await this.handleReminderUpcoming(interaction);
        return true;
      case 'reminder_view_prev':
        await this.handleReminderPageChange(interaction, -1);
        return true;
      case 'reminder_view_next':
        await this.handleReminderPageChange(interaction, 1);
        return true;
      case 'reminder_view_edit':
        await this.handleReminderEdit(interaction);
        return true;
      case 'reminder_view_delete':
        await this.handleReminderDelete(interaction);
        return true;
      case 'settings_staff_channel':
      case 'settings_logs_channel':
      case 'settings_ticket_category':
      case 'settings_backup_db':
      case 'settings_reset_config':
      case 'export_role':
      case 'export_analytics':
      case 'export_tickets':
      case 'export_logs':
        await interaction.reply({ content: 'This dashboard feature is under construction.', ephemeral: true });
        return true;
      default:
        return false;
    }
  }

  async handleRoleAdd(interaction) {
    await interaction.update({ content: 'Select a role to add from the menu.', embeds: [], components: [
      require('../ui/components').createRoleSelect('role_select_add'),
      require('../ui/components').createNavigationButtons(),
    ] });
  }

  async handleRoleRemove(interaction) {
    await interaction.update({ content: 'Select a role to remove from the menu.', embeds: [], components: [
      require('../ui/components').createRoleSelect('role_select_remove'),
      require('../ui/components').createNavigationButtons(),
    ] });
  }

  async handleRoleExport(interaction) {
    await interaction.update({ content: 'Select a role to export from the menu.', embeds: [], components: [
      require('../ui/components').createRoleSelect('role_select_export'),
      require('../ui/components').createNavigationButtons(),
    ] });
  }

  async handleAnalyticsReaction(interaction) {
    await interaction.update({ content: 'Please send a Discord message link in the channel.', embeds: [], components: [require('../ui/components').createNavigationButtons()] });
    this.setFollowUp(interaction.user.id, 'analytics_reaction');
  }

  async handleAnalyticsAfterPost(interaction) {
    await interaction.update({ content: 'Please send a Discord message link in the channel.', embeds: [], components: [require('../ui/components').createNavigationButtons()] });
    this.setFollowUp(interaction.user.id, 'analytics_afterpost');
  }

  async handleAnalyticsTopPoster(interaction) {
    const channelSelect = require('../ui/components').createChannelSelect('topposter_channel_select', 'Select a channel', [0]);
    await interaction.update({ content: 'Select a text channel for top poster analytics.', embeds: [], components: [channelSelect, require('../ui/components').createNavigationButtons()] });
  }

  async handleAnalyticsNonReactors(interaction) {
    await interaction.update({ content: 'Please send a Discord message link for the nonreactors report.', embeds: [], components: [require('../ui/components').createNavigationButtons()] });
    this.setFollowUp(interaction.user.id, 'analytics_nonreactors');
  }

  async handleTicketCreatePanel(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await interaction.followUp({ content: 'Please run !ticketsetup in the staff channel to create the ticket panel.', ephemeral: true });
  }

  async handleTicketSettings(interaction) {
    const config = db.prepare('SELECT daily_ticket_limit FROM ticket_configs WHERE guild_id = ?').get(interaction.guild.id) || {};
    const currentLimit = typeof config.daily_ticket_limit === 'number' ? config.daily_ticket_limit : 1;
    const ticketLimitSelect = require('../ui/components').createTicketLimitSelect('ticket_limit_select', 'Select the daily ticket limit');
    await interaction.update({
      content: `Current daily ticket limit: ${currentLimit === 0 ? 'Unlimited' : currentLimit}`,
      embeds: [],
      components: [ticketLimitSelect, require('../ui/components').createNavigationButtons()],
    });
  }

  async handleTicketClose(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await interaction.followUp({ content: 'Please use !ticketclose inside a ticket channel to close the ticket.', ephemeral: true });
  }

  async handleTicketClaim(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await interaction.followUp({ content: 'Please use !ticketclaim inside a ticket channel to claim the ticket.', ephemeral: true });
  }

  async handleTicketTranscript(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await interaction.followUp({ content: 'Please use !tickettranscript inside the ticket channel to generate a transcript.', ephemeral: true });
  }

  async handleReminderCenter(interaction) {
    await interaction.update({ embeds: [createReminderCenterEmbed()], components: getReminderCenterComponents() });
  }

  async handleReminderCreate(interaction) {
    await reminderCreate.handleReminderCreate(interaction);
  }

  async handleReminderTypeSelection(interaction) {
    const type = interaction.customId.replace('reminder_type_', '');
    const labels = {
      personal: 'Personal Reminder',
      dm: 'DM Reminder',
      channel: 'Channel Reminder',
      role: 'Role Reminder',
    };
    const selectedLabel = labels[type] || 'Reminder';

    await interaction.update({
      embeds: [createReminderEmbed(interaction.user, 2, `${selectedLabel} selected`)],
      components: [require('../ui/components').createNavigationButtons()],
    });
  }

  async handleReminderView(interaction) {
    const session = this.sessions.get(interaction.user.id);
    const page = session?.followUp?.reminderPage || 1;
    const embed = reminderManager.buildReminderListEmbed(interaction.guild.id, page);
    await interaction.update({ embeds: [embed], components: reminderManager.createReminderPaginationComponents(page) });
    if (session) {
      session.followUp = { ...session.followUp, reminderPage: page };
      this.sessions.set(interaction.user.id, session);
    }
  }

  async handleReminderUpcoming(interaction) {
    const embed = reminderManager.buildUpcomingEmbed(interaction.guild.id);
    await interaction.update({ embeds: [embed], components: [require('../ui/components').createNavigationButtons()] });
  }

  async handleReminderEdit(interaction) {
    await interaction.reply({ embeds: [infoEmbed('Reminder Edit', 'Use View Reminders and select a reminder by ID to edit. This feature is coming soon.')], ephemeral: true });
  }

  async handleReminderDelete(interaction) {
    await interaction.reply({ embeds: [infoEmbed('Reminder Delete', 'Use View Reminders and note the reminder ID, then run the delete command or use the delete workflow once available.')], ephemeral: true });
  }

  async handleReminderPageChange(interaction, direction) {
    const session = this.sessions.get(interaction.user.id) || {};
    const currentPage = session.followUp?.reminderPage || 1;
    const nextPage = Math.max(1, currentPage + direction);
    const embed = reminderManager.buildReminderListEmbed(interaction.guild.id, nextPage);
    await interaction.update({ embeds: [embed], components: reminderManager.createReminderPaginationComponents(nextPage) });
    session.followUp = { ...(session.followUp || {}), reminderPage: nextPage };
    this.sessions.set(interaction.user.id, session);
  }

  startDMWorkflow(userId, channelId, guildId, followUpState) {
    let session = this.sessions.get(userId);
    if (!session) {
      session = {
        userId,
        messageId: null,
        channelId,
        guildId,
        lastInteraction: Date.now(),
        state: 'dashboard',
      };
    }
    session.followUp = followUpState;
    session.channelId = channelId;
    session.guildId = guildId;
    // Preserve the dashboard panel message ID and keep preview message IDs in followUp.messageId.
    if (followUpState && followUpState.messageId) {
      session.followUp.messageId = followUpState.messageId;
    }
    this.sessions.set(userId, session);
    this.updateSession(userId);
  }

  updateSessionMessageId(userId, messageId) {
    const session = this.sessions.get(userId);
    if (!session) return;
    session.followUp = session.followUp || {};
    session.followUp.messageId = messageId;
  }

  async handleDirectMessageSingle(interaction) {
    await interaction.update({ content: 'Mention a user or paste a user ID in this channel to send them a DM.', embeds: [], components: [require('../ui/components').createNavigationButtons()] });
    this.startDMWorkflow(interaction.user.id, interaction.channel.id, interaction.guild.id, { type: 'dm_single_recipient' });
  }

  async handleDirectMessageMass(interaction) {
    await interaction.update({ content: 'Mention a role, use @everyone, or paste user IDs to determine recipients.', embeds: [], components: [require('../ui/components').createNavigationButtons()] });
    this.startDMWorkflow(interaction.user.id, interaction.channel.id, interaction.guild.id, { type: 'dm_mass_recipients' });
  }

  async handleDirectMessageConfirm(interaction) {
    const session = this.sessions.get(interaction.user.id);
    if (!session?.followUp || session.followUp.type !== 'dm_confirm') {
      await interaction.reply({ content: 'No active direct message workflow found.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const { recipients, content, attachments, label, mode } = session.followUp;
    const sessionId = `${interaction.user.id}-${Date.now()}`;
    await interaction.editReply({ content: `Sending ${mode === 'mass' ? 'mass' : 'single'} DM to ${recipients.length} recipient(s)...` });

    const results = await dmManager.sendDirectMessages(this.client, interaction.user, recipients, content, attachments, async (progress) => {
      await interaction.editReply({ content: `Sending DMs... ${progress.current}/${progress.total} delivered, ${progress.failed} failed.` });
    });

    const reportPath = dmManager.buildReportFile(results, sessionId);
    await interaction.editReply({
      content: `Direct message ${mode === 'mass' ? 'broadcast' : 'send'} complete. ${results.filter((row) => row.status === 'Sent').length} delivered, ${results.filter((row) => row.status === 'Failed').length} failed.`,
      files: [new (require('discord.js').AttachmentBuilder)(reportPath).setName('dm-report.csv')],
    });

    delete session.followUp;
  }

  async handleDirectMessageCancel(interaction) {
    const session = this.sessions.get(interaction.user.id);
    if (!session?.followUp || session.followUp.type !== 'dm_confirm') {
      await interaction.reply({ content: 'No direct message workflow to cancel.', ephemeral: true });
      return;
    }

    delete session.followUp;
    await interaction.reply({ content: 'Direct message workflow canceled.', ephemeral: true });
  }

  async handleSelectMenu(interaction) {
    const session = this.getSession(interaction.user.id);
    if (!session || session.guildId !== interaction.guild.id) {
      return;
    }

    this.updateSession(interaction.user.id);

    if (interaction.customId === 'role_select_add') {
      const roleId = interaction.values[0];
      session.followUp = { type: 'role_add', roleId };
      await interaction.update({ content: 'Role selected. Please upload a TXT file in this channel.', embeds: [], components: [require('../ui/components').createNavigationButtons()] });
      return;
    }

    if (interaction.customId === 'role_select_remove') {
      const roleId = interaction.values[0];
      session.followUp = { type: 'role_remove', roleId };
      await interaction.update({ content: 'Role selected. Please upload a TXT file in this channel.', embeds: [], components: [require('../ui/components').createNavigationButtons()] });
      return;
    }

    if (interaction.customId === 'role_select_export') {
      const roleId = interaction.values[0];
      await require('../commands/roles/roleexport').execute(interaction, [roleId]);
      return;
    }

    if (interaction.customId === 'topposter_channel_select') {
      const channelId = interaction.values[0];
      const monthOptions = [];
      const now = new Date();
      for (let i = 0; i < 12; i += 1) {
        const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
        const label = date.toLocaleString('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' });
        const value = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
        monthOptions.push({ label, value });
      }
      this.sessions.get(interaction.user.id).followUp = { type: 'topposter', channelId };
      const monthSelect = require('../ui/components').createMonthSelect('topposter_month_select', 'Select a month', monthOptions);
      await interaction.update({ content: 'Select the month to report on.', embeds: [], components: [monthSelect, require('../ui/components').createNavigationButtons()] });
      return;
    }

    if (interaction.customId === 'topposter_month_select') {
      const session = this.sessions.get(interaction.user.id);
      if (!session?.followUp || session.followUp.type !== 'topposter') return;
      const channelId = session.followUp.channelId;
      const monthValue = interaction.values[0];
      await require('../commands/analytics/topposter').execute(interaction, [channelId, monthValue]);
      delete session.followUp;
      return;
    }

    if (interaction.customId === 'ticket_limit_select') {
      const limitValue = Number(interaction.values[0]);
      const limit = Number.isInteger(limitValue) && limitValue >= 0 ? limitValue : 1;
      db.prepare('INSERT OR IGNORE INTO ticket_configs (guild_id, daily_ticket_limit) VALUES (?, ?)').run(interaction.guild.id, limit);
      db.prepare('UPDATE ticket_configs SET daily_ticket_limit = ? WHERE guild_id = ?').run(limit, interaction.guild.id);
      await interaction.update({
        content: `Daily ticket limit updated to: ${limit === 0 ? 'Unlimited' : limit}`,
        embeds: [],
        components: [require('../ui/components').createNavigationButtons()],
      });
      return;
    }
  }

  setFollowUp(userId, step) {
    const session = this.sessions.get(userId);
    if (!session) return;
    session.followUp = step;
  }

  async handleFollowUpMessage(message) {
    const session = this.getSession(message.author.id);
    if (!session || session.channelId !== message.channel.id) return;
    if (!session.followUp) return;
    if (message.content.startsWith(PREFIX) && !['dm_single_content', 'dm_mass_content'].includes(session.followUp.type)) return;

    if (session.followUp === 'analytics_reaction') {
      const command = require('../commands/analytics/reactionlist');
      await command.execute(message, [message.content.trim()]);
      delete session.followUp;
      return;
    }

    if (session.followUp === 'analytics_afterpost') {
      const command = require('../commands/analytics/afterpost');
      await command.execute(message, [message.content.trim()]);
      delete session.followUp;
      return;
    }

    if (session.followUp === 'analytics_nonreactors') {
      const command = require('../commands/analytics/nonreactors');
      await command.execute(message, [message.content.trim()]);
      delete session.followUp;
      return;
    }

    if (session.followUp.type === 'role_add') {
      const command = require('../commands/roles/roleadd');
      await command.execute(message, [session.followUp.roleId]);
      delete session.followUp;
      return;
    }

    if (session.followUp.type === 'role_remove') {
      const command = require('../commands/roles/roleremove');
      await command.execute(message, [session.followUp.roleId]);
      delete session.followUp;
      return;
    }
    if (session.followUp.type === 'dm_single_recipient') {
      const parsed = await dmManager.parseSingleRecipient(message, message.content.trim());
      if (!parsed) {
        await message.reply({ embeds: [errorEmbed('Invalid Recipient', 'Please mention a valid user or provide a valid Discord user ID.')] });
        return;
      }
      session.followUp = {
        type: 'dm_single_content',
        recipients: parsed.recipients,
        label: parsed.label,
      };
      await message.reply({ embeds: [infoEmbed('Recipient Confirmed', `Now send the DM content and any attachments in this channel.`)] });
      return;
    }

    if (session.followUp.type === 'dm_mass_recipients') {
      const parsed = await dmManager.parseMassRecipients(message, message.content.trim());
      if (!parsed) {
        await message.reply({ embeds: [errorEmbed('Invalid Recipients', 'Please mention a role, use @everyone, or provide valid user IDs.')] });
        return;
      }
      session.followUp = {
        type: 'dm_mass_content',
        recipients: parsed.recipients,
        label: parsed.label,
      };
      await message.reply({ embeds: [infoEmbed('Recipients Confirmed', `Now send the DM content and any attachments in this channel.`)] });
      return;
    }

    if (session.followUp.type === 'dm_single_content' || session.followUp.type === 'dm_mass_content') {
      const content = message.content.trim();
      const attachments = dmManager.buildAttachmentBuilders(message);
      if (!content && !attachments.length) {
        await message.reply({ embeds: [infoEmbed('Message Required', 'Please provide message text or attach files to send.')] });
        return;
      }
      const mode = session.followUp.type === 'dm_single_content' ? 'single' : 'mass';
      const preview = await message.reply({
        embeds: [dmManager.createDMPreviewEmbed(message.author, session.followUp.label, content, attachments, mode)],
        components: [
          new (require('discord.js').ActionRowBuilder)().addComponents(
            new (require('discord.js').ButtonBuilder)().setCustomId('dm_confirm').setLabel('Confirm').setStyle(require('discord.js').ButtonStyle.Success),
            new (require('discord.js').ButtonBuilder)().setCustomId('dm_cancel').setLabel('Cancel').setStyle(require('discord.js').ButtonStyle.Danger),
          ),
        ],
      });
      session.followUp = {
        type: 'dm_confirm',
        mode,
        recipients: session.followUp.recipients,
        content,
        attachments,
        label: session.followUp.label,
        messageId: preview.id,
      };
      this.updateSessionMessageId(message.author.id, preview.id);
      return;
    }

    if (session.followUp.type === 'role_remove') {
      const command = require('../commands/roles/roleremove');
      await command.execute(message, [session.followUp.roleId]);
      delete session.followUp;
      return;
    }  }
}

module.exports = DashboardHandler;
