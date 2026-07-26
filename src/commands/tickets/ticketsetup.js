const { db } = require('../../database');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');

module.exports = {
  name: 'ticketsetup',
  description: 'Create the support ticket system for this server.',
  async execute(message) {
    if (!message.guild) return;
    if (!hasStaffPermission(message.member)) {
      await message.reply({ embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can use this command.')] });
      return;
    }

    const category = await message.guild.channels.create({
      name: 'Support Tickets',
      type: 4,
      permissionOverwrites: [
        {
          id: message.guild.id,
          deny: ['ViewChannel'],
        },
      ],
    });

    const panel = await message.guild.channels.create({
      name: 'ticket-panel',
      type: 0,
      parent: category.id,
    });

    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('open_ticket')
        .setLabel('Open Ticket')
        .setStyle(ButtonStyle.Primary)
    );

    await panel.send({
      embeds: [
        {
          title: 'Ticket Panel',
          description: 'Click the button below to open a new support ticket.',
          color: 0x3498db,
        },
      ],
      components: [row],
    });

    const logs = await message.guild.channels.create({
      name: 'ticket-logs',
      type: 0,
      parent: category.id,
    });

    db.prepare('INSERT OR REPLACE INTO ticket_configs (guild_id, category_id, panel_id, logs_id) VALUES (?, ?, ?, ?)').run(message.guild.id, category.id, panel.id, logs.id);
    await message.reply({ embeds: [successEmbed('Ticket System Setup', 'Support category, panel, and logs have been created.')] });
  },
};
