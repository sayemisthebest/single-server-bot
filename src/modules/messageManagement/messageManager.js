const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, StringSelectMenuBuilder, ChannelType, EmbedBuilder } = require('discord.js');
const { errorEmbed, infoEmbed } = require('../../utils/embeds');
const { db } = require('../../database');
const deleteSession = require('./deleteSession');
const { deleteRecentMessages, parseCount: parseRecentCount, ensureChannelPermissions: ensureBulkPermissions } = require('./bulkDelete');
const { deleteUserMessages, parseCount: parseUserCount, ensureChannelPermissions: ensureUserPermissions } = require('./userDelete');
const { sendDeletionLog } = require('./deleteLogger');
const { createDeleteConfirmComponents } = require('../../ui/messageManagement');
const logger = require('../../utils/logger');

const countOptions = [
  { label: '10', value: '10' },
  { label: '25', value: '25' },
  { label: '50', value: '50' },
  { label: '100', value: '100' },
  { label: '250', value: '250' },
  { label: '500', value: '500' },
  { label: '1000', value: '1000' },
  { label: 'Custom', value: 'custom' },
];

function isAuthorized(member) {
  if (!member) return false;
  return member.permissions.has('Administrator') || member.permissions.has('ManageMessages');
}

function getStaffChannel(guildId) {
  const config = db.prepare('SELECT staff_channel_id FROM guild_configs WHERE guild_id = ?').get(guildId);
  return config?.staff_channel_id;
}

function createCountSelect(customId) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder('Choose the deletion count')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(countOptions),
  );
}

function createChannelSelect(customId) {
  return new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder('Select a channel')
      .setChannelTypes([ChannelType.GuildText]),
  );
}

function createMessageManagementEmbed() {
  return new EmbedBuilder()
    .setTitle('Message Management')
    .setDescription('Choose what you want to delete from channels or users.')
    .setColor(0xe74c3c)
    .setTimestamp()
    .setFooter({ text: 'RHINOMODERATION Message Management' });
}

async function startDeleteSession(interaction, followUpState) {
  const session = deleteSession.startSession(interaction.user.id, interaction.channel.id, interaction.guild.id, {
    ...followUpState,
    messageId: interaction.message.id,
  });
  return session;
}

async function handleDeleteCommand(message, args) {
  if (!message.guild) return;
  if (!isAuthorized(message.member)) {
    await message.reply({ embeds: [errorEmbed('Access Denied', 'Only Administrators or members with Manage Messages may use this command.')] });
    return;
  }

  const staffChannelId = getStaffChannel(message.guild.id);
  if (staffChannelId && message.channel.id !== staffChannelId) {
    await message.reply({ embeds: [errorEmbed('Private Staff Channel Required', 'This command can only be used in the configured private staff channel.')] });
    return;
  }

  const embed = createMessageManagementEmbed();
  const components = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('mm_delete_recent').setLabel('Delete Recent Messages').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
      new ButtonBuilder().setCustomId('mm_delete_user').setLabel('Delete Specific User Messages').setStyle(ButtonStyle.Secondary).setEmoji('👤'),
      new ButtonBuilder().setCustomId('mm_back').setLabel('Back').setStyle(ButtonStyle.Secondary).setEmoji('⬅️'),
      new ButtonBuilder().setCustomId('mm_close').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('❌'),
    ),
  ];

  const reply = await message.reply({ embeds: [embed], components, fetchReply: true });
  deleteSession.startSession(message.author.id, message.channel.id, message.guild.id, { type: 'main_menu', messageId: reply.id });
}

async function handleInteraction(interaction) {
  const allowedIds = new Set([
    'mm_close',
    'mm_back',
    'mm_delete_recent',
    'mm_delete_user',
    'mm_channel_recent',
    'mm_channel_user',
    'mm_count_recent',
    'mm_count_user',
    'mm_user_select',
    'mm_confirm_delete',
    'mm_cancel_delete',
  ]);

  if (!interaction.customId || !allowedIds.has(interaction.customId)) {
    return false;
  }

  const session = deleteSession.getSession(interaction.user.id);
  const requiresSession = new Set([
    'mm_channel_recent',
    'mm_channel_user',
    'mm_count_recent',
    'mm_count_user',
    'mm_user_select',
    'mm_confirm_delete',
    'mm_cancel_delete',
  ]);

  if (requiresSession.has(interaction.customId)) {
    if (!session || session.messageId !== interaction.message.id) {
      return false;
    }
  } else {
    if (!session || session.messageId !== interaction.message.id) {
      deleteSession.startSession(interaction.user.id, interaction.channel.id, interaction.guild.id, { type: 'main_menu', messageId: interaction.message.id });
    }
  }

  if (!isAuthorized(interaction.member)) {
    await interaction.reply({ content: 'You are not authorized to use Message Management.', ephemeral: true });
    return true;
  }

  if (interaction.customId === 'mm_close') {
    deleteSession.endSession(interaction.user.id);
    await interaction.update({ content: 'Message management session closed.', embeds: [], components: [] });
    return true;
  }

  if (interaction.customId === 'mm_back') {
    deleteSession.endSession(interaction.user.id);
    await interaction.update({ content: 'Message management session closed.', embeds: [], components: [] });
    return true;
  }

  if (interaction.customId === 'mm_delete_recent') {
    await interaction.update({ content: 'Select the channel where you want to delete recent messages.', embeds: [], components: [createChannelSelect('mm_channel_recent'), new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mm_close').setLabel('Close').setStyle(ButtonStyle.Danger))] });
    await startDeleteSession(interaction, { type: 'delete_recent_channel' });
    return true;
  }

  if (interaction.customId === 'mm_delete_user') {
    await interaction.update({ content: 'Select the channel where you want to delete a specific user messages.', embeds: [], components: [createChannelSelect('mm_channel_user'), new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mm_close').setLabel('Close').setStyle(ButtonStyle.Danger))] });
    await startDeleteSession(interaction, { type: 'delete_user_channel' });
    return true;
  }

  if (interaction.isChannelSelectMenu()) {
    const channelId = interaction.values[0];
    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) {
      await interaction.reply({ embeds: [errorEmbed('Invalid Channel', 'Unable to access that channel.')], ephemeral: true });
      return true;
    }

    if (interaction.customId === 'mm_channel_recent') {
      await interaction.update({ content: `Selected channel ${channel.toString()}. Choose the number of recent messages to delete.`, embeds: [], components: [createCountSelect('mm_count_recent'), new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mm_close').setLabel('Close').setStyle(ButtonStyle.Danger))] });
      deleteSession.updateSession(interaction.user.id, { type: 'delete_recent_count', channelId });
      return true;
    }

    if (interaction.customId === 'mm_channel_user') {
      await interaction.update({ content: `Selected channel ${channel.toString()}. Please mention the target user, provide a user ID, or type a display name.`, embeds: [], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mm_close').setLabel('Close').setStyle(ButtonStyle.Danger))] });
      deleteSession.updateSession(interaction.user.id, { type: 'delete_user_target', channelId });
      return true;
    }
  }

  if (interaction.isStringSelectMenu()) {
    const session = deleteSession.getSession(interaction.user.id);
    if (!session) {
      await interaction.reply({ content: 'Session expired or invalid.', ephemeral: true });
      return true;
    }

    const selected = interaction.values[0];
    if (interaction.customId === 'mm_count_recent') {
      if (selected === 'custom') {
        await interaction.update({ content: 'Enter a custom delete count (maximum 5000).', embeds: [], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mm_close').setLabel('Close').setStyle(ButtonStyle.Danger))] });
        deleteSession.updateSession(interaction.user.id, { type: 'delete_recent_custom' });
        return true;
      }
      deleteSession.updateSession(interaction.user.id, { type: 'delete_recent_confirm', count: Number(selected) });
      await interaction.update({ content: `Confirm deletion of ${selected} recent messages in <#${session.followUp.channelId}>.`, embeds: [], components: createDeleteConfirmComponents() });
      return true;
    }

    if (interaction.customId === 'mm_count_user') {
      if (selected === 'custom') {
        await interaction.update({ content: 'Enter a custom delete count for the user (maximum 5000).', embeds: [], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mm_close').setLabel('Close').setStyle(ButtonStyle.Danger))] });
        deleteSession.updateSession(interaction.user.id, { type: 'delete_user_custom' });
        return true;
      }
      deleteSession.updateSession(interaction.user.id, { type: 'delete_user_confirm', count: Number(selected) });
      const userField = session.followUp.user ? `${session.followUp.user.tag} (${session.followUp.user.id})` : 'Unknown user';
      await interaction.update({ content: `Confirm deletion of ${selected} messages from ${userField} in <#${session.followUp.channelId}>.`, embeds: [], components: createDeleteConfirmComponents() });
      return true;
    }

    if (interaction.customId === 'mm_user_select') {
      const selectedUserId = interaction.values[0];
      const targetUser = await interaction.client.users.fetch(selectedUserId).catch(() => null);
      if (!targetUser) {
        await interaction.reply({ embeds: [errorEmbed('User Not Found', 'Could not resolve the selected user.')], ephemeral: true });
        return true;
      }
      deleteSession.updateSession(interaction.user.id, { type: 'delete_user_count', user: targetUser });
      await interaction.update({ content: `Target user ${targetUser.tag} selected. Choose the number of messages to delete.`, embeds: [], components: [createCountSelect('mm_count_user'), new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mm_close').setLabel('Close').setStyle(ButtonStyle.Danger))] });
      return true;
    }
  }

  if (interaction.customId === 'mm_confirm_delete') {
    const session = deleteSession.getSession(interaction.user.id);
    if (!session || !session.followUp) {
      await interaction.reply({ content: 'No active delete operation found.', ephemeral: true });
      return true;
    }

    const channel = interaction.guild.channels.cache.get(session.followUp.channelId);
    if (!channel || !channel.isTextBased()) {
      await interaction.reply({ embeds: [errorEmbed('Invalid Channel', 'Unable to access the selected channel.')], ephemeral: true });
      return true;
    }

    const botHasPerms = await ensureBulkPermissions(channel);
    if (!botHasPerms) {
      await interaction.reply({ embeds: [errorEmbed('Missing Permissions', 'The bot requires Manage Messages, View Channel, and Read Message History permissions.')], ephemeral: true });
      return true;
    }

    await interaction.update({ content: 'Starting deletion... this may take a moment.', embeds: [], components: [] });
    let progressMessage = null;
    try {
      progressMessage = await interaction.followUp({ content: 'Preparing deletion...', ephemeral: true, fetchReply: true });
    } catch (error) {
      logger.warn(`Unable to create deletion progress message: ${error.message}`);
    }

    const editProgressMessage = async (options) => {
      if (!progressMessage) return;
      try {
        await progressMessage.edit(options);
      } catch (editError) {
        logger.warn(`Failed to update deletion progress message: ${editError.message}`);
        progressMessage = null;
      }
    };

    try {
      let result;
      if (session.followUp.type === 'delete_recent_confirm') {
        const requested = session.followUp.count;
        result = await deleteRecentMessages(channel, requested, async (progress) => {
          await editProgressMessage({ content: `Deleting Messages...\nDeleted: ${progress.deleted}\nRemaining: ${progress.remaining}\nSkipped: ${progress.skipped}` });
        });
        await sendDeletionLog(interaction.guild, interaction.user, channel, null, requested, result.deleted, result.skipped);
      } else if (session.followUp.type === 'delete_user_confirm') {
        const requested = session.followUp.count;
        if (!session.followUp.user) {
          await editProgressMessage({ content: 'Target user is invalid for deletion.', embeds: [], components: [] });
          return true;
        }
        result = await deleteUserMessages(channel, session.followUp.user.id, requested, async (progress) => {
          await editProgressMessage({ content: `Deleting Messages...\nDeleted: ${progress.deleted}\nRemaining: ${progress.remaining}\nSkipped: ${progress.skipped}` });
        });
        await sendDeletionLog(interaction.guild, interaction.user, channel, session.followUp.user, requested, result.deleted, result.skipped);
      }

      if (progressMessage) {
        await editProgressMessage({ content: `Deletion complete. Deleted: ${result.deleted}. Skipped: ${result.skipped}. Failed: ${result.failed}.`, components: [] });
      } else {
        await interaction.followUp({ content: `Deletion complete. Deleted: ${result.deleted}. Skipped: ${result.skipped}. Failed: ${result.failed}.`, ephemeral: true }).catch(() => {});
      }
    } catch (error) {
      logger.error(`Delete operation failed: ${error.stack || error.message}`);
      if (progressMessage) {
        await editProgressMessage({ content: 'An error occurred during deletion. Please check bot permissions and try again.', components: [] });
      } else {
        await interaction.followUp({ content: 'An error occurred during deletion. Please check bot permissions and try again.', ephemeral: true }).catch(() => {});
      }
    }

    deleteSession.endSession(interaction.user.id);
    return true;
  }

  if (interaction.customId === 'mm_cancel_delete') {
    deleteSession.endSession(interaction.user.id);
    await interaction.update({ content: 'Deletion cancelled.', embeds: [], components: [] });
    return true;
  }

  return false;
}

async function handleFollowUpMessage(message) {
  const session = deleteSession.getSession(message.author.id);
  if (!session || session.channelId !== message.channel.id) return false;
  if (!session.followUp) return false;

  if (session.followUp.type === 'delete_recent_custom' || session.followUp.type === 'delete_user_custom') {
    const count = parseRecentCount(message.content.trim());
    if (count === null) {
      await message.reply({ embeds: [errorEmbed('Invalid Number', 'Please enter a number between 1 and 5000.')], ephemeral: true });
      return true;
    }
    const nextType = session.followUp.type === 'delete_recent_custom' ? 'delete_recent_confirm' : 'delete_user_confirm';
    deleteSession.updateSession(message.author.id, { type: nextType, count });
    const userPart = session.followUp.user ? ` from ${session.followUp.user.tag}` : '';
    await message.reply({ content: `Confirm deletion of ${count} messages${userPart} in <#${session.followUp.channelId}>.`, components: createDeleteConfirmComponents() });
    return true;
  }

  if (session.followUp.type === 'delete_user_target') {
    let targetUser = null;
    const raw = message.content.trim();
    const mention = message.mentions.users.first();
    if (mention) targetUser = mention;
    if (!targetUser) {
      const id = raw.match(/\d{17,19}/)?.[0];
      if (id) targetUser = await message.client.users.fetch(id).catch(() => null);
    }
    if (!targetUser) {
      const lowered = raw.toLowerCase();
      const members = await message.guild.members.fetch().catch(() => null);
      if (members) {
        const matches = members.filter((member) => {
          const username = member.user.username.toLowerCase();
          const display = member.displayName.toLowerCase();
          return username === lowered || display === lowered || member.user.tag.toLowerCase() === lowered;
        });
        if (matches.size === 1) {
          targetUser = matches.first().user;
        } else if (matches.size > 1) {
          const options = matches.map((member) => ({ label: `${member.user.tag}`, value: member.user.id })).slice(0, 25);
          await message.reply({ content: 'Multiple users match that name. Please select one from the menu.', components: [
            new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('mm_user_select')
                .setPlaceholder('Select the correct user')
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(options),
            ),
          ] });
          deleteSession.updateSession(message.author.id, { type: 'delete_user_select' });
          return true;
        }
      }
    }

    if (!targetUser) {
      await message.reply({ embeds: [errorEmbed('User Not Found', 'Could not resolve a valid user from that input.')], ephemeral: true });
      return true;
    }

    deleteSession.updateSession(message.author.id, { type: 'delete_user_count', user: targetUser });
    await message.reply({ content: `Target user ${targetUser.tag} selected. Choose the number of messages to delete.`, components: [createCountSelect('mm_count_user'), new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mm_close').setLabel('Close').setStyle(ButtonStyle.Danger))] });
    return true;
  }

  if (session.followUp.type === 'delete_user_select') {
    return false;
  }

  return false;
}

module.exports = { handleDeleteCommand, handleInteraction, handleFollowUpMessage, createMessageManagementEmbed };
