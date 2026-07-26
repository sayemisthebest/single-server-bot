const { db } = require('../../database');
const { successEmbed, errorEmbed, warningEmbed } = require('../../utils/embeds');
const { hasStaffPermission, hasBotPermissions } = require('../../utils/permissions');
const logger = require('../../utils/logger');

module.exports = {
  name: 'setup',
  description: 'Initialize the staff manager for this server.',
  async execute(message) {
    if (!message.guild) return;

    const member = message.member;
    if (!hasStaffPermission(member)) {
      await message.reply({ embeds: [errorEmbed('Access Denied', 'Only staff with Manage Roles or Administrator can run setup.')] });
      return;
    }

    const guildConfig = db.prepare('SELECT * FROM guild_configs WHERE guild_id = ?').get(message.guild.id);
    if (!guildConfig) {
      db.prepare('INSERT INTO guild_configs (guild_id, prefix) VALUES (?, ?)').run(message.guild.id, '!');
    }

    const missingPermissions = [];
    const botMember = message.guild.members.me;
    const perms = message.channel.permissionsFor(botMember);
    for (const permission of ['ManageRoles', 'ManageChannels', 'ManageMessages', 'ReadMessageHistory', 'ViewChannel', 'SendMessages', 'EmbedLinks', 'AttachFiles', 'ManageThreads', 'UseExternalEmojis', 'CreatePublicThreads', 'CreatePrivateThreads']) {
      if (!perms.has(permission)) missingPermissions.push(permission);
    }

    if (missingPermissions.length) {
      await message.reply({ embeds: [warningEmbed('Permissions Missing', `The bot is missing: ${missingPermissions.join(', ')}`)] });
      return;
    }

    db.prepare('INSERT OR IGNORE INTO ticket_configs (guild_id) VALUES (?)').run(message.guild.id);
    db.prepare('UPDATE guild_configs SET updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?').run(message.guild.id);

    await message.reply({ embeds: [successEmbed('Setup Complete', 'The server has been initialized successfully.')] });
    logger.info(`Setup completed for guild ${message.guild.id}`);
  },
};
