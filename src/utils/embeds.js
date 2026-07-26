const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../config/constants');

function successEmbed(title, description) {
  return new EmbedBuilder().setColor(COLORS.SUCCESS).setTitle(title).setDescription(description);
}

function infoEmbed(title, description) {
  return new EmbedBuilder().setColor(COLORS.INFO).setTitle(title).setDescription(description);
}

function errorEmbed(title, description) {
  return new EmbedBuilder().setColor(COLORS.ERROR).setTitle(title).setDescription(description);
}

function warningEmbed(title, description) {
  return new EmbedBuilder().setColor(COLORS.WARNING).setTitle(title).setDescription(description);
}

module.exports = { successEmbed, infoEmbed, errorEmbed, warningEmbed };
