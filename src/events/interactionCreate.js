const { db } = require('../database');
const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../utils/embeds');
const logger = require('../utils/logger');

module.exports = async (client, interaction) => {
  if (!interaction.guild) return;

  try {
    if (interaction.isButton()) {
      const handled = await client.dashboardHandler.handleInteraction(interaction);
      if (handled) return;
    }

    if (interaction.isStringSelectMenu() || interaction.isChannelSelectMenu()) {
      await client.dashboardHandler.handleSelectMenu(interaction);
      return;
    }

    if (!interaction.isButton()) return;
  } catch (error) {
    logger.error(`Interaction error: ${error.stack || error.message}`);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'An error occurred while processing the interaction.', ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: 'An error occurred while processing the interaction.', ephemeral: true }).catch(() => {});
    }
    return;
  }

  const config = db.prepare('SELECT category_id, logs_id FROM ticket_configs WHERE guild_id = ?').get(interaction.guild.id);
  if (!config) {
    await interaction.reply({ embeds: [errorEmbed('Ticket System Not Setup', 'Run !ticketsetup first to initialize tickets.')], ephemeral: true });
    return;
  }

  if (interaction.customId === 'open_ticket') {
    const category = interaction.guild.channels.cache.get(config.category_id);
    if (!category || category.type !== ChannelType.GuildCategory) {
      await interaction.reply({ embeds: [errorEmbed('Ticket Category Missing', 'The ticket category could not be found.')] , ephemeral: true});
      return;
    }

    const existingChannel = interaction.guild.channels.cache.find((channel) =>
      channel.parentId === category.id && channel.topic === `ticket-owner:${interaction.user.id}`
    );
    if (existingChannel) {
      await interaction.reply({ embeds: [infoEmbed('Ticket Already Open', `You already have a ticket: ${existingChannel}`)], ephemeral: true });
      return;
    }

    const staffRoles = interaction.guild.roles.cache.filter((role) =>
      role.permissions.has(PermissionFlagsBits.ManageRoles) || role.permissions.has(PermissionFlagsBits.Administrator)
    );

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

    staffRoles.each((role) => {
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

    await channel.send({ embeds: [successEmbed('Ticket Opened', `Welcome ${interaction.user}. A staff member will join soon.`)] });
    await interaction.reply({ embeds: [successEmbed('Ticket Created', `Your ticket has been opened: ${channel}`)], ephemeral: true });

    if (config.logs_id) {
      const logsChannel = interaction.guild.channels.cache.get(config.logs_id);
      if (logsChannel?.isTextBased()) {
        await logsChannel.send({ content: `Ticket opened by ${interaction.user.tag}: ${channel}` }).catch(() => {});
      }
    }

    logger.info(`Ticket opened by ${interaction.user.tag} in ${interaction.guild.name}`);
  }
};
