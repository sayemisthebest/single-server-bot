const { infoEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'help',
  description: 'Show the help menu.',
  async execute(message) {
    const helpText = [
      'Setup Commands',
      '!setup',
      '!setstaffchannel #channel',
      '!config',
      '!resetconfig',
      '',
      'Role Commands',
      '!roleadd @Role',
      '!roleremove @Role',
      '!roleexport @Role',
      '',
      'Analytics Commands',
      '!reactionlist <message_link>',
      '!afterpost <message_link>',
      '!topposter #channel',
      '!nonreactors <message_link>',
      '!rolenonreactors @Role <message_link>',
      '!postcount #channel [YYYY-MM]',
      '',
      'Direct Message Commands',
      '!dm <@user|user_id> <message>',
      '!massdm <@role|@everyone|user_id ...> <message>',
      '!reminder',
      '',
      'Message Management',
      '!delete',
      '',
      'Ticket Commands',
      '!ticketsetup',
      '!ticketclose',
      '!ticketrename',
      '!ticketadd',
      '!ticketremove',
      '!ticketclaim',
      '!tickettranscript',
    ].join('\n');

    await message.reply({ embeds: [infoEmbed('RHINOMODERATION Help', helpText)] });
  },
};
