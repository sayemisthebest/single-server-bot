const fs = require('fs');
const path = require('path');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasStaffPermission } = require('../../utils/permissions');

module.exports = {
  name: 'tickettranscript',
  description: 'Generate an HTML transcript for the current ticket.',
  async execute(message) {
    if (!message.guild) return;
    if (!hasStaffPermission(message.member)) {
      await message.reply({ embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can use this command.')] });
      return;
    }

    const messages = await message.channel.messages.fetch({ limit: 100 });
    const html = `<!DOCTYPE html><html><body><h1>Ticket Transcript</h1>${Array.from(messages.values()).map((msg) => `<p><strong>${msg.author.tag}</strong>: ${msg.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join('')}</body></html>`;
    const outputPath = path.join(__dirname, '..', '..', '..', 'logs', `${message.channel.id}-transcript.html`);
    fs.writeFileSync(outputPath, html, 'utf8');
    await message.reply({ embeds: [successEmbed('Transcript Generated', 'The transcript has been saved locally and is ready for download.')] });
  },
};
