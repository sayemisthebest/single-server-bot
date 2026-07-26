const { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { errorEmbed, infoEmbed, successEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');
const dmManager = require('../../modules/directMessages/dmManager');

module.exports = {
  name: 'massdm',
  description: 'Send a direct message to multiple recipients.',
  async execute(message, args) {
    if (!message.guild) return;
    if (!hasStaffPermission(message.member)) {
      await message.reply({ embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can use this command.')] });
      return;
    }

    const rawTarget = args.shift();
    const content = args.join(' ').trim();
    const attachments = dmManager.buildAttachmentBuilders(message);

    if (!rawTarget) {
      await message.reply({ embeds: [infoEmbed('Mass DM Setup', 'Please provide a role mention, @everyone, or a list of IDs to message.')] });
      message.client.dashboardHandler.startDMWorkflow(message.author.id, message.channel.id, message.guild.id, { type: 'dm_mass_recipients' });
      return;
    }

    const parsed = await dmManager.parseMassRecipients(message, rawTarget);
    if (!parsed) {
      await message.reply({ embeds: [errorEmbed('Invalid Recipients', 'Please mention a role, use @everyone, or provide valid user IDs.')] });
      return;
    }

    if (!content && !attachments.length) {
      await message.reply({ embeds: [infoEmbed('Message Content Required', 'Please type the message contents for the DM in this channel.')] });
      message.client.dashboardHandler.startDMWorkflow(message.author.id, message.channel.id, message.guild.id, {
        type: 'dm_mass_content',
        recipients: parsed.recipients,
        label: parsed.label,
      });
      return;
    }

    const previewMessage = await message.reply({
      embeds: [dmManager.createDMPreviewEmbed(message.author, parsed.label, content, attachments, 'mass')],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('dm_confirm').setLabel('Confirm').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('dm_cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger),
        ),
      ],
    });

    message.client.dashboardHandler.startDMWorkflow(message.author.id, message.channel.id, message.guild.id, {
      type: 'dm_confirm',
      mode: 'mass',
      recipients: parsed.recipients,
      content,
      attachments,
      label: parsed.label,
      messageId: previewMessage.id,
    });
  },
};
