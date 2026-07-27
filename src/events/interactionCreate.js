const { db } = require('../database');
const { PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../utils/embeds');
const logger = require('../utils/logger');

function normalizeTicketLimit(value) {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 0) return 1;
  return limit;
}

function getTodayUTCDate() {
  const now = new Date();
  const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return utcDate.toISOString().slice(0, 10);
}

module.exports = async (client, interaction) => {
  if (!interaction.guild) return;

  if ((interaction.isButton() || interaction.isStringSelectMenu() || interaction.isChannelSelectMenu()) && interaction.customId?.startsWith('ticketsetup_')) {
    return;
  }

  try {
    if (interaction.isButton() && ['open_ticket', 'ticket_close_button'].includes(interaction.customId)) {
      const config = db.prepare('SELECT * FROM ticket_configs WHERE guild_id = ?').get(interaction.guild.id);
      if (!config) {
        await interaction.reply({ embeds: [errorEmbed('Ticket System Not Setup', 'Run !ticketsetup first to initialize tickets.')], ephemeral: true });
        return;
      }

      if (interaction.customId === 'ticket_close_button') {
        if (!interaction.channel || !interaction.channel.name.toLowerCase().includes('ticket')) {
          await interaction.reply({ embeds: [errorEmbed('Invalid Ticket', 'This button can only be used inside a ticket channel.')], ephemeral: true });
          return;
        }

        await interaction.reply({ embeds: [successEmbed('Ticket Closed', 'The ticket has been closed and the channel will be deleted.')], ephemeral: true });

        const ticketChannel = interaction.channel;
        const ticketOwnerId = ticketChannel.topic?.match(/ticket-owner:(\d{17,19})/)?.[1];
        if (config.logs_id) {
          const logsChannel = interaction.guild.channels.cache.get(config.logs_id);
          if (logsChannel?.isTextBased()) {
            await logsChannel.send({ content: `Ticket closed by ${interaction.user.tag}${ticketOwnerId ? ` for <@${ticketOwnerId}>` : ''}: ${ticketChannel.name}` }).catch(() => {});
          }
        }

        await ticketChannel.delete('Ticket closed by staff via button').catch((error) => {
          logger.error(`Failed to delete ticket channel: ${error.message}`);
        });
        return;
      }

      const category = interaction.guild.channels.cache.get(config.category_id);
      if (!category || category.type !== ChannelType.GuildCategory) {
        await interaction.reply({ embeds: [errorEmbed('Ticket Category Missing', 'The ticket category could not be found.')], ephemeral: true });
        return;
      }

      const ticketLimit = normalizeTicketLimit(config.daily_ticket_limit ?? 1);
      if (ticketLimit > 0) {
        const today = getTodayUTCDate();
        const countRecord = db.prepare('SELECT * FROM ticket_daily_counts WHERE guild_id = ? AND user_id = ?').get(interaction.guild.id, interaction.user.id);
        const currentCount = countRecord && countRecord.reset_date === today ? (Number(countRecord.ticket_count) || 0) : 0;

        if (currentCount >= ticketLimit) {
          await interaction.reply({
            embeds: [errorEmbed('Ticket Limit Reached', `You have reached today's ticket limit.\n\nDaily Limit:\n${ticketLimit}\n\nYou may create another ticket after the daily reset.`)],
            ephemeral: true,
          });
          return;
        }
      }

      const existingChannel = interaction.guild.channels.cache.find((channel) =>
        channel.parentId === category.id && channel.topic === `ticket-owner:${interaction.user.id}`
      );
      if (existingChannel) {
        await interaction.reply({ embeds: [infoEmbed('Ticket Already Open', `You already have a ticket: ${existingChannel}`)], ephemeral: true });
        return;
      }

      const configRoleIds = [];
      try {
        const parsedRoles = JSON.parse(config.support_role_ids || '[]');
        if (Array.isArray(parsedRoles)) {
          configRoleIds.push(...parsedRoles);
        }
      } catch {
        // ignore invalid JSON
      }

      const supportRoles = interaction.guild.roles.cache.filter((role) => configRoleIds.includes(role.id));
      const overwrites = [
        {
          id: interaction.guild.roles.everyone,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
        {
          id: interaction.guild.members.me.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
      ];

      supportRoles.each((role) => {
        overwrites.push({
          id: role.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        });
      });

      const ticketName = `ticket-${interaction.user.username}`.replace(/[^a-z0-9-]/gi, '').toLowerCase().slice(0, 90);
      const channel = await interaction.guild.channels.create({
        name: ticketName || `ticket-${interaction.user.id}`,
        type: ChannelType.GuildText,
        parent: category.id,
        topic: `ticket-owner:${interaction.user.id}`,
        permissionOverwrites: overwrites,
      });

      const closeButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_close_button')
          .setLabel('Close Ticket')
          .setStyle(ButtonStyle.Danger),
      );

      await channel.send({ embeds: [successEmbed('Ticket Opened', `Welcome ${interaction.user}. A staff member will join soon.`)], components: [closeButton] });
      await interaction.reply({ embeds: [successEmbed('Ticket Created', `Your ticket has been opened: ${channel}`)], ephemeral: true });

      if (ticketLimit > 0) {
        const today = getTodayUTCDate();
        const nowISO = new Date().toISOString();
        const countRecord = db.prepare('SELECT * FROM ticket_daily_counts WHERE guild_id = ? AND user_id = ?').get(interaction.guild.id, interaction.user.id);
        const nextCount = countRecord && countRecord.reset_date === today ? (Number(countRecord.ticket_count) || 0) + 1 : 1;

        if (countRecord) {
          db.prepare('UPDATE ticket_daily_counts SET ticket_count = ?, last_ticket_timestamp = ?, reset_date = ? WHERE guild_id = ? AND user_id = ?')
            .run(nextCount, nowISO, today, interaction.guild.id, interaction.user.id);
        } else {
          db.prepare('INSERT OR REPLACE INTO ticket_daily_counts (guild_id, user_id, ticket_count, last_ticket_timestamp, reset_date) VALUES (?, ?, ?, ?, ?)')
            .run(interaction.guild.id, interaction.user.id, nextCount, nowISO, today);
        }
      }

      if (config.logs_id) {
        const logsChannel = interaction.guild.channels.cache.get(config.logs_id);
        if (logsChannel?.isTextBased()) {
          await logsChannel.send({ content: `Ticket opened by ${interaction.user.tag}: ${channel}` }).catch(() => {});
        }
      }

      logger.info(`Ticket opened by ${interaction.user.tag} in ${interaction.guild.name}`);
      return;
    }

    if (interaction.isButton()) {
      const handled = await client.dashboardHandler.handleInteraction(interaction);
      if (handled) return;
      const mgHandled = await client.messageManager.handleInteraction(interaction);
      if (mgHandled) return;
    }

    if (interaction.isStringSelectMenu() || interaction.isChannelSelectMenu() || interaction.isRoleSelectMenu() || interaction.isUserSelectMenu()) {
      const handled = await client.dashboardHandler.handleSelectMenu(interaction);
      if (handled) return;
      const mgHandled = await client.messageManager.handleInteraction(interaction);
      if (mgHandled) return;
    }

    if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isChannelSelectMenu()) return;
  } catch (error) {
    logger.error(`Interaction error: ${error.stack || error.message}`);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'An error occurred while processing the interaction.', ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: 'An error occurred while processing the interaction.', ephemeral: true }).catch(() => {});
    }
    return;
  }

  if ((interaction.isButton() || interaction.isStringSelectMenu() || interaction.isChannelSelectMenu()) && !interaction.replied && !interaction.deferred && !interaction.customId?.startsWith('ticketsetup_')) {
    await interaction.reply({ content: 'This interaction is no longer valid or the session has expired. Please reopen the dashboard or retry the command.', ephemeral: true }).catch(() => {});
  }
};
