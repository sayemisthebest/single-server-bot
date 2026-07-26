const { PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');

const MAX_BATCH = 100;
const MAX_DELETE = 5000;
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

function isDeletableMessage(message) {
  if (!message) return false;
  const age = Date.now() - new Date(message.createdAt).getTime();
  return age <= MAX_AGE_MS;
}

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

async function deleteRecentMessages(channel, count, progressCallback) {
  const result = { deleted: 0, skipped: 0, failed: 0 };
  let remaining = count;
  let before = null;

  while (remaining > 0) {
    const fetchCount = Math.min(MAX_BATCH, remaining);
    let messages;
    try {
      messages = await channel.messages.fetch({ limit: fetchCount, before });
    } catch (error) {
      logger.error(`Failed to fetch messages for bulk delete: ${error.message}`);
      throw new Error('Failed to fetch messages from channel.');
    }

    if (!messages?.size) break;
    const batch = Array.from(messages.values());
    before = batch[batch.length - 1].id;

    const deletable = batch.filter(isDeletableMessage);
    const skippedCount = batch.length - deletable.length;
    result.skipped += skippedCount;

    for (const message of deletable) {
      try {
        await message.delete();
        result.deleted += 1;
      } catch (error) {
        result.failed += 1;
        logger.warn(`Failed deleting message ${message.id}: ${error.message}`);
      }
      remaining -= 1;
      if (progressCallback) {
        await progressCallback({ deleted: result.deleted, skipped: result.skipped, failed: result.failed, requested: count, remaining });
      }
      if (remaining <= 0) break;
    }

    if (batch.length < fetchCount) break;
  }

  return result;
}

module.exports = { deleteRecentMessages, parseCount, ensureChannelPermissions };
