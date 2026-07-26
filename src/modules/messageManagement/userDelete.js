const { PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');

const MAX_BATCH = 100;
const MAX_DELETE = 5000;
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

function parseCount(value) {
  const count = Number(value);
  if (!Number.isInteger(count) || count <= 0 || count > MAX_DELETE) return null;
  return count;
}

async function ensureChannelPermissions(channel) {
  if (!channel || !channel.isTextBased()) return false;
  const botMember = channel.guild.members.me;
  const permissions = channel.permissionsFor(botMember);
  return permissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages]);
}

function isDeletableMessage(message) {
  if (!message) return false;
  const age = Date.now() - new Date(message.createdAt).getTime();
  return age <= MAX_AGE_MS;
}

async function deleteUserMessages(channel, userId, count, progressCallback) {
  const result = { deleted: 0, skipped: 0, failed: 0, remaining: count };
  let before = null;

  while (result.deleted < count) {
    let messages;
    try {
      messages = await channel.messages.fetch({ limit: MAX_BATCH, before });
    } catch (error) {
      logger.error(`Failed to fetch messages for user delete: ${error.message}`);
      throw new Error('Failed to fetch messages from channel.');
    }

    if (!messages?.size) break;
    const batch = Array.from(messages.values());
    before = batch[batch.length - 1].id;

    for (const message of batch) {
      if (result.deleted >= count) break;
      if (message.author.id !== userId) continue;
      if (!isDeletableMessage(message)) {
        result.skipped += 1;
        continue;
      }

      try {
        await message.delete();
        result.deleted += 1;
      } catch (error) {
        result.failed += 1;
        logger.warn(`Failed deleting user message ${message.id}: ${error.message}`);
      }

      if (progressCallback) {
        await progressCallback({ deleted: result.deleted, skipped: result.skipped, failed: result.failed, requested: count, remaining: Math.max(0, count - result.deleted) });
      }
    }

    if (batch.length < MAX_BATCH) break;
  }

  return result;
}

module.exports = { deleteUserMessages, parseCount, ensureChannelPermissions };
