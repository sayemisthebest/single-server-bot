const { createDashboardEmbed, createDashboardComponents } = require('../ui/dashboard');
const { createRoleManagerEmbed, getRoleManagerComponents } = require('../ui/roleManager');
const { createAnalyticsEmbed, getAnalyticsComponents } = require('../ui/analytics');
const { createTicketEmbed, getTicketComponents } = require('../ui/tickets');
const { createSettingsEmbed, getSettingsComponents } = require('../ui/settings');
const { createExportEmbed, getExportComponents } = require('../ui/exports');
const { createHelpEmbed, getHelpComponents } = require('../ui/help');
const { hasStaffPermission } = require('../utils/permissions');
const { db } = require('../database');
const { errorEmbed } = require('../utils/embeds');
const logger = require('../utils/logger');

class DashboardHandler {
  constructor(client) {
    this.client = client;
    this.sessions = new Map();
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
    setTimeout(() => this.expireSession(userId), 300000);
  }

  expireSession(userId) {
    const session = this.sessions.get(userId);
    if (!session) return;
    if (Date.now() - session.lastInteraction >= 300000) {
      this.sessions.delete(userId);
    }
  }

  getSession(userId) {
    return this.sessions.get(userId);
  }

  updateSession(userId) {
    const session = this.sessions.get(userId);
    if (!session) return;
    session.lastInteraction = Date.now();
  }

  async handleInteraction(interaction) {
    const session = this.getSession(interaction.user.id);
    if (!session || session.messageId !== interaction.message.id) {
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
      case 'dashboard_home':
        await interaction.update({ embeds: [createDashboardEmbed(interaction.guild, this.client)], components: createDashboardComponents() });
        return true;
      case 'dashboard_back':
        await interaction.update({ embeds: [createDashboardEmbed(interaction.guild, this.client)], components: createDashboardComponents() });
        return true;
      case 'dashboard_close':
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
    const roleOptions = interaction.guild.roles.cache
      .filter((role) => role.name !== '@everyone')
      .map((role) => ({ label: role.name, value: role.id }));
    await interaction.update({ content: 'Select a role to add from the menu.', embeds: [], components: [
      require('../ui/components').createRoleSelect(roleOptions, 'role_select_add'),
      require('../ui/components').createNavigationButtons(),
    ] });
  }

  async handleRoleRemove(interaction) {
    const roleOptions = interaction.guild.roles.cache
      .filter((role) => role.name !== '@everyone')
      .map((role) => ({ label: role.name, value: role.id }));
    await interaction.update({ content: 'Select a role to remove from the menu.', embeds: [], components: [
      require('../ui/components').createRoleSelect(roleOptions, 'role_select_remove'),
      require('../ui/components').createNavigationButtons(),
    ] });
  }

  async handleRoleExport(interaction) {
    const roleOptions = interaction.guild.roles.cache
      .filter((role) => role.name !== '@everyone')
      .map((role) => ({ label: role.name, value: role.id }));
    await interaction.update({ content: 'Select a role to export from the menu.', embeds: [], components: [
      require('../ui/components').createRoleSelect(roleOptions, 'role_select_export'),
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

  async handleSelectMenu(interaction) {
    const session = this.getSession(interaction.user.id);
    if (!session || session.messageId !== interaction.message.id) {
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
      const fakeMessage = Object.assign(message, { content: `!roleadd <@&${session.followUp.roleId}>` });
      await command.execute(fakeMessage, []);
      delete session.followUp;
      return;
    }

    if (session.followUp.type === 'role_remove') {
      const command = require('../commands/roles/roleremove');
      const fakeMessage = Object.assign(message, { content: `!roleremove <@&${session.followUp.roleId}>` });
      await command.execute(fakeMessage, []);
      delete session.followUp;
      return;
    }
  }
}

module.exports = DashboardHandler;
