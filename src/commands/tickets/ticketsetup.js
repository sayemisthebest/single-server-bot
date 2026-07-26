const { db } = require('../../database');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');

function createCancelButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticketsetup_cancel')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger),
  );
}

function createConfirmButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticketsetup_confirm')
      .setLabel('Confirm')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('ticketsetup_cancel')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger),
  );
}

function createEmbed(step, title, description) {
  return new EmbedBuilder()
    .setTitle(`Ticket Setup — Step ${step}`)
    .setDescription(description)
    .setColor(0x3498db)
    .setTimestamp();
}

module.exports = {
  name: 'ticketsetup',
  description: 'Configure the ticket system using an interactive wizard.',
  async execute(message) {
    if (!message.guild) return;
    if (!hasStaffPermission(message.member)) {
      await message.reply({ embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can use this command.')] });
      return;
    }

    const setupState = {
      categoryId: null,
      panelChannelId: null,
      logsChannelId: null,
      supportRoleIds: [],
    };

    const categorySelect = new ChannelSelectMenuBuilder()
      .setCustomId('ticketsetup_category')
      .setPlaceholder('Select an existing category')
      .setChannelTypes([ChannelType.GuildCategory]);

    const panelChannelSelect = new ChannelSelectMenuBuilder()
      .setCustomId('ticketsetup_panel_channel')
      .setPlaceholder('Select an existing text channel for the ticket panel')
      .setChannelTypes([ChannelType.GuildText]);

    const logsChannelSelect = new ChannelSelectMenuBuilder()
      .setCustomId('ticketsetup_logs_channel')
      .setPlaceholder('Select an existing logs channel')
      .setChannelTypes([ChannelType.GuildText]);

    const supportRoleSelect = new RoleSelectMenuBuilder()
      .setCustomId('ticketsetup_support_roles')
      .setPlaceholder('Select one or more support roles')
      .setMinValues(1)
      .setMaxValues(25);

    const initialEmbed = createEmbed(1, 'Ticket Setup', 'Choose an existing category to store ticket channels.');
    const initialMessage = await message.reply({
      embeds: [initialEmbed],
      components: [new ActionRowBuilder().addComponents(categorySelect), createCancelButton()],
      fetchReply: true,
    });

    const collector = initialMessage.createMessageComponentCollector({
      filter: (interaction) => interaction.user.id === message.author.id,
      time: 300000,
    });

    let currentStep = 1;
    let completed = false;

    collector.on('collect', async (interaction) => {
      try {
        if (interaction.customId === 'ticketsetup_cancel') {
          await interaction.update({ embeds: [errorEmbed('Ticket Setup Cancelled', 'The ticket setup has been cancelled.')], components: [] });
          collector.stop('cancelled');
          return;
        }

        if (currentStep === 1 && interaction.isChannelSelectMenu() && interaction.customId === 'ticketsetup_category') {
          setupState.categoryId = interaction.values[0];
          currentStep = 2;
          await interaction.update({
            embeds: [createEmbed(2, 'Ticket Setup', 'Select the existing text channel where the ticket panel will be posted.')],
            components: [new ActionRowBuilder().addComponents(panelChannelSelect), createCancelButton()],
          });
          return;
        }

        if (currentStep === 2 && interaction.isChannelSelectMenu() && interaction.customId === 'ticketsetup_panel_channel') {
          setupState.panelChannelId = interaction.values[0];
          currentStep = 3;
          await interaction.update({
            embeds: [createEmbed(3, 'Ticket Setup', 'Select the existing logs channel for ticket events.')],
            components: [new ActionRowBuilder().addComponents(logsChannelSelect), createCancelButton()],
          });
          return;
        }

        if (currentStep === 3 && interaction.isChannelSelectMenu() && interaction.customId === 'ticketsetup_logs_channel') {
          setupState.logsChannelId = interaction.values[0];
          currentStep = 4;
          await interaction.update({
            embeds: [createEmbed(4, 'Ticket Setup', 'Select one or more support roles that can handle tickets.')],
            components: [new ActionRowBuilder().addComponents(supportRoleSelect), createCancelButton()],
          });
          return;
        }

        if (currentStep === 4 && interaction.isRoleSelectMenu() && interaction.customId === 'ticketsetup_support_roles') {
          setupState.supportRoleIds = interaction.values;
          currentStep = 5;

          const category = message.guild.channels.cache.get(setupState.categoryId);
          const panelChannel = message.guild.channels.cache.get(setupState.panelChannelId);
          const logsChannel = message.guild.channels.cache.get(setupState.logsChannelId);
          const supportRoles = setupState.supportRoleIds
            .map((roleId) => message.guild.roles.cache.get(roleId))
            .filter(Boolean);

          const confirmationEmbed = new EmbedBuilder()
            .setTitle('Ticket Setup Confirmation')
            .setColor(0x2ecc71)
            .addFields(
              { name: 'Category', value: category ? category.name : 'Not found', inline: false },
              { name: 'Ticket Panel Channel', value: panelChannel ? `<#${panelChannel.id}>` : 'Not found', inline: false },
              { name: 'Logs Channel', value: logsChannel ? `<#${logsChannel.id}>` : 'Not found', inline: false },
              { name: 'Support Roles', value: supportRoles.length ? supportRoles.map((role) => role.toString()).join(', ') : 'None', inline: false },
            )
            .setFooter({ text: 'Confirm to save these settings and post the ticket panel.' });

          await interaction.update({ embeds: [confirmationEmbed], components: [createConfirmButtons()] });
          return;
        }

        if (currentStep === 5 && interaction.customId === 'ticketsetup_confirm') {
          const category = message.guild.channels.cache.get(setupState.categoryId);
          const panelChannel = message.guild.channels.cache.get(setupState.panelChannelId);
          const logsChannel = message.guild.channels.cache.get(setupState.logsChannelId);

          if (!category || category.type !== ChannelType.GuildCategory) {
            await interaction.update({ embeds: [errorEmbed('Invalid Category', 'The selected category is no longer available.')], components: [] });
            collector.stop('invalid');
            return;
          }

          if (!panelChannel?.isTextBased()) {
            await interaction.update({ embeds: [errorEmbed('Invalid Panel Channel', 'The selected panel channel is no longer available.')], components: [] });
            collector.stop('invalid');
            return;
          }

          if (!logsChannel?.isTextBased()) {
            await interaction.update({ embeds: [errorEmbed('Invalid Logs Channel', 'The selected logs channel is no longer available.')], components: [] });
            collector.stop('invalid');
            return;
          }

          db.prepare('INSERT OR REPLACE INTO ticket_configs (guild_id, category_id, panel_id, logs_id, support_role_ids) VALUES (?, ?, ?, ?, ?)')
            .run(message.guild.id, setupState.categoryId, setupState.panelChannelId, setupState.logsChannelId, JSON.stringify(setupState.supportRoleIds));

          const ticketButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('open_ticket')
              .setLabel('Open Ticket')
              .setStyle(ButtonStyle.Primary),
          );

          await panelChannel.send({
            embeds: [
              {
                title: 'Ticket Panel',
                description: 'Click the button below to open a new support ticket.',
                color: 0x3498db,
              },
            ],
            components: [ticketButton],
          });

          await interaction.update({ embeds: [successEmbed('Ticket System Configured', 'The ticket panel has been posted and the configuration has been saved.')], components: [] });
          collector.stop('completed');
          completed = true;
          return;
        }
      } catch (error) {
        collector.stop('error');
        await interaction.followUp({ content: 'An error occurred during ticket setup. Please try again.', ephemeral: true }).catch(() => {});
      }
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'time' && !completed) {
        await initialMessage.edit({ embeds: [errorEmbed('Ticket Setup Timed Out', 'The setup wizard has expired after 5 minutes.')], components: [] }).catch(() => {});
      }
    });
  },
};
