const fs = require('fs');
const path = require('path');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed, infoEmbed, successEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

function isSnowflake(value) {
  return typeof value === 'string' && /^\d{17,19}$/.test(value);
}

async function resolveUserById(client, id) {
  if (!isSnowflake(id)) return null;
  return client.users.fetch(id).catch(() => null);
}

function uniqueUsers(users) {
  const map = new Map();
  for (const user of users) {
    if (user && !user.bot && !map.has(user.id)) {
      map.set(user.id, user);
    }
  }
  return [...map.values()];
}

async function parseSingleRecipient(message, rawTarget) {
  if (!message.guild) return null;

  if (message.mentions.users.size) {
    const user = message.mentions.users.first();
    if (user && !user.bot) {
      return { recipients: [user], label: `${user.tag}` };
    }
  }

  const id = (rawTarget || '').match(/\d{17,19}/)?.[0];
  if (id) {
    const user = await resolveUserById(message.client, id);
    if (user && !user.bot) {
      return { recipients: [user], label: `${user.tag}` };
    }
  }

  return null;
}

async function parseMassRecipients(message, rawTarget) {
  if (!message.guild) return null;
  const text = (rawTarget || '').trim();
  const lower = text.toLowerCase();

  if (message.mentions.roles.size) {
    const role = message.mentions.roles.first();
    if (role) {
      const memberCollection = await role.members.fetch?.().catch(() => role.members) || role.members;
      const users = uniqueUsers(memberCollection.filter((member) => !member.user.bot).map((member) => member.user));
      if (users.length) {
        return { recipients: users, label: `Role ${role.name}` };
      }
    }
  }

  if (message.mentions.users.size) {
    const users = uniqueUsers([...message.mentions.users.values()]);
    if (users.length) {
      return { recipients: users, label: `Mentioned users (${users.length})` };
    }
  }

  if (['all', '@all', 'everyone', '@everyone'].includes(lower)) {
    const members = await message.guild.members.fetch().catch(() => null);
    const users = members
      ? uniqueUsers(members.filter((member) => !member.user.bot).map((member) => member.user))
      : [];
    if (users.length) {
      return { recipients: users, label: 'All members' };
    }
  }

  const ids = Array.from(new Set((text.match(/\d{17,19}/g) || [])));
  if (ids.length > 0) {
    const users = [];
    for (const id of ids) {
      const user = await resolveUserById(message.client, id);
      if (user && !user.bot) users.push(user);
    }
    const unique = uniqueUsers(users);
    if (unique.length) {
      return { recipients: unique, label: `Recipients (${unique.length})` };
    }
  }

  return null;
}

function buildAttachmentBuilders(message) {
  return message.attachments.map((attachment) => new AttachmentBuilder(attachment.url).setName(attachment.name));
}

function createDMPreviewEmbed(author, targetLabel, content, attachments, mode) {
  return new EmbedBuilder()
    .setTitle(mode === 'mass' ? 'Mass DM Preview' : 'Single DM Preview')
    .setDescription(content || '_No message text provided._')
    .setColor(0x3498db)
    .addFields(
      { name: 'From', value: author.tag, inline: true },
      { name: 'Recipients', value: targetLabel || 'Unknown', inline: true },
      { name: 'Attachments', value: attachments.length ? `${attachments.length} file(s)` : 'None', inline: true },
    )
    .setTimestamp();
}

function createDMEmbed(author, content) {
  return new EmbedBuilder()
    .setTitle('Message from Staff')
    .setDescription(content || '_No message text provided._')
    .setColor(0x2ecc71)
    .setFooter({ text: `Sent by ${author.tag}` })
    .setTimestamp();
}

function escapeCSV(value) {
  if (value == null) return '';
  const normalized = value.toString().replace(/\r?\n/g, ' ');
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function buildReportFile(results, sessionId) {
  const csvRows = results.map((row) => [
    row.id,
    row.tag,
    row.status,
    row.error || '',
  ].map(escapeCSV).join(','));
  const csv = ['Recipient ID,Recipient Tag,Status,Error', ...csvRows].join('\n');
  const fileName = `${sessionId}-dm-report.csv`;
  const outputPath = path.join(__dirname, '..', '..', '..', 'logs', fileName);
  fs.writeFileSync(outputPath, csv, 'utf8');
  return outputPath;
}

async function sendDirectMessages(client, author, recipients, content, attachments, progressCallback) {
  const results = [];
  const total = recipients.length;
  const dmEmbed = createDMEmbed(author, content);

  for (let index = 0; index < total; index += 1) {
    const recipient = recipients[index];
    const result = { id: recipient.id, tag: recipient.tag, status: 'Sent', error: '' };
    try {
      await recipient.send({ embeds: [dmEmbed], files: attachments });
    } catch (error) {
      result.status = 'Failed';
      result.error = error?.message || 'Unknown error';
      logger.error(`DM send failed to ${recipient.id}: ${result.error}`);
    }
    results.push(result);
    if (progressCallback && (index + 1 === total || (index + 1) % 5 === 0)) {
      await progressCallback({ current: index + 1, total, success: results.filter((r) => r.status === 'Sent').length, failed: results.filter((r) => r.status === 'Failed').length });
    }
  }

  return results;
}

module.exports = {
  parseSingleRecipient,
  parseMassRecipients,
  buildAttachmentBuilders,
  createDMPreviewEmbed,
  createDMEmbed,
  sendDirectMessages,
  buildReportFile,
};
