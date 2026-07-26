const { EmbedBuilder } = require('discord.js');
const { createNavigationButtons } = require('./components');

function createHelpEmbed() {
  return new EmbedBuilder()
    .setTitle('RHINOMODERATION Help')
    .setDescription('Use the dashboard buttons to access features or run the existing commands directly.')
    .setColor(0x2c3e50)
    .addFields(
      { name: 'Setup', value: '`!setup`, `!setstaffchannel #channel`, `!config`, `!resetconfig`' },
      { name: 'Role Management', value: '`!roleadd @Role`, `!roleremove @Role`, `!roleexport @Role`' },
      { name: 'Analytics', value: '`!reactionlist <message_link>`, `!afterpost <message_link>`, `!topposter #channel`' },
      { name: 'Ticket System', value: '`!ticketsetup`, `!ticketclose`, `!ticketrename`, `!ticketadd`, `!ticketremove`, `!ticketclaim`, `!tickettranscript`' },
    )
    .setTimestamp()
    .setFooter({ text: 'RHINOMODERATION Help' });
}

module.exports = { createHelpEmbed, getHelpComponents: createNavigationButtons };
