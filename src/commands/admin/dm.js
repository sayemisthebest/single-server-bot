const { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { errorEmbed, infoEmbed, successEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');
const dmManager = require('../../modules/directMessages/dmManager');

module.exports = {
  name: 'dm',
  description: 'Send a direct message to a single user.',
  async execute(message, args) {
    if (!message.guild) return;
    if (!hasStaffPermission(message.member)) {
      await message.reply({ embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can use this command.')] });
      return;
    }

    const rawTarget = args.shift();
    const content = args.join(' ').trim();
    const attachments = dmManager.buildAttachmentBuilders(message);
    const session = message.client.dashboardHandler.getSession(message.author.id);

    if (!rawTarget) {
      await message.reply({ embeds: [infoEmbed('Single DM Setup', 'Please provide a user mention or ID to message.')] });
      message.client.dashboardHandler.startDMWorkflow(message.author.id, message.channel.id, message.guild.id, { type: 'dm_single_recipient' });
      return;
    }

    const parsed = await dmManager.parseSingleRecipient(message, rawTarget);
    if (!parsed) {
      await message.reply({ embeds: [errorEmbed('Invalid User', 'Please mention a valid user or provide a valid Discord user ID.')] });
      return;
    }

    if (!content && !attachments.length) {
      await message.reply({ embeds: [infoEmbed('Message Content Required', 'Please type the message contents for the DM in this channel.')] });
      message.client.dashboardHandler.startDMWorkflow(message.author.id, message.channel.id, message.guild.id, {
        type: 'dm_single_content',
        recipients: parsed.recipients,
        label: parsed.label,
      });
      return;
    }

    const previewMessage = await message.reply({
      embeds: [dmManager.createDMPreviewEmbed(message.author, parsed.label, content, attachments, 'single')],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('dm_confirm').setLabel('Confirm').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('dm_cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger),
        ),
      ],
    });

    message.client.dashboardHandler.startDMWorkflow(message.author.id, message.channel.id, message.guild.id, {
      type: 'dm_confirm',
      mode: 'single',
      recipients: parsed.recipients,
      content,
      attachments,
      label: parsed.label,
      messageId: previewMessage.id,
    });
  },
};
