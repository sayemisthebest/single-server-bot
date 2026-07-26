const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createRoleManagerButtons, createNavigationButtons, createRoleSelect } = require('./components');
const { hasStaffPermission } = require('../utils/permissions');
const { db } = require('../database');

function createRoleManagerEmbed() {
  return new EmbedBuilder()
    .setTitle('Role Manager')
    .setDescription('Use the buttons below to manage roles and exports.')
    .setColor(0x2ecc71)
    .setTimestamp()
    .setFooter({ text: 'RHINOMODERATION Role Manager' });
}

function createRoleSelectMenu(guild, customId) {
  const roleOptions = guild.roles.cache
    .filter((role) => role.name !== '@everyone')
    .map((role) => ({ label: role.name, value: role.id }));
  return createRoleSelect(roleOptions, customId);
}

function getRoleManagerComponents(guild) {
  return [createRoleManagerButtons(), createNavigationButtons()];
}

module.exports = { createRoleManagerEmbed, createRoleSelectMenu, getRoleManagerComponents };
