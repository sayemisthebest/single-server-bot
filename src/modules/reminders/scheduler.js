const { Client, EmbedBuilder } = require('discord.js');
const { getActiveReminders, updateReminder } = require('./database');
const { logReminderEvent } = require('./reminderLogger');
const logger = require('../../utils/logger');

function parseRepeat(nextRun, repeatType) {
  const date = new Date(nextRun);
  switch (repeatType) {
    case 'daily':
      date.setUTCDate(date.getUTCDate() + 1);
      return date.getTime();
    case 'weekly':
      date.setUTCDate(date.getUTCDate() + 7);
      return date.getTime();
    case 'monthly':
      date.setUTCMonth(date.getUTCMonth() + 1);
      return date.getTime();
    case 'yearly':
      date.setUTCFullYear(date.getUTCFullYear() + 1);
      return date.getTime();
    default:
      if (repeatType && repeatType.startsWith('interval:')) {
        const interval = Number(repeatType.split(':')[1]) || 0;
        if (interval > 0) {
          return date.getTime() + interval;
        }
      }
      return null;
  }
}

function buildReminderEmbed(author, reminder) {
  return new EmbedBuilder()
    .setTitle(`Reminder: ${reminder.title}`)
    .setDescription(reminder.message || '_No message provided._')
    .setColor(0x9b59b6)
    .addFields(
      { name: 'Type', value: reminder.type, inline: true },
      { name: 'Reminder ID', value: String(reminder.id), inline: true },
      { name: 'Scheduled', value: new Date(reminder.delivery_timestamp).toUTCString(), inline: true },
    )
    .setTimestamp();
}

async function deliverReminder(client, reminder) {
  const guild = await client.guilds.fetch(reminder.guild_id).catch(() => null);
  if (!guild) {
    logReminderEvent({
      creatorId: reminder.creator_id,
      guildId: reminder.guild_id,
      reminderId: reminder.id,
      deliveryTime: new Date(reminder.delivery_timestamp).toISOString(),
      status: 'failed',
      success: false,
      failureReason: 'Guild not found',
    });
    return;
  }

  const metadata = reminder.metadata ? JSON.parse(reminder.metadata) : {};
  const embed = buildReminderEmbed(guild.client.user, reminder);
  const attachments = metadata.attachments || [];
  const fileObjects = attachments.map((item) => ({ attachment: item.url, name: item.name }));
  const result = { status: 'sent', success: true, failureReason: null };

  try {
    if (reminder.type === 'personal') {
      const user = await client.users.fetch(reminder.creator_id).catch(() => null);
      if (!user) throw new Error('Creator user not found');
      await user.send({ embeds: [embed], files: fileObjects });
      result.recipientId = reminder.creator_id;
    } else if (reminder.type === 'dm') {
      const user = await client.users.fetch(reminder.recipient_user_id).catch(() => null);
      if (!user) throw new Error('Recipient user not found');
      await user.send({ embeds: [embed], files: fileObjects });
      result.recipientId = reminder.recipient_user_id;
    } else if (reminder.type === 'channel') {
      const channel = await guild.channels.fetch(reminder.recipient_channel_id).catch(() => null);
      if (!channel || !channel.isTextBased()) throw new Error('Channel not found or invalid');
      await channel.send({ embeds: [embed], files: fileObjects });
      result.recipientChannelId = reminder.recipient_channel_id;
    } else if (reminder.type === 'role') {
      const channel = await guild.channels.fetch(reminder.recipient_channel_id).catch(() => null);
      const role = guild.roles.cache.get(reminder.recipient_role_id);
      if (!channel || !channel.isTextBased()) throw new Error('Channel not found or invalid');
      if (!role) throw new Error('Role not found');
      await channel.send({ content: `<@&${role.id}>`, embeds: [embed], files: fileObjects });
      result.recipientRoleId = reminder.recipient_role_id;
      result.recipientChannelId = reminder.recipient_channel_id;
    } else {
      throw new Error('Invalid reminder type');
    }
  } catch (error) {
    result.status = 'failed';
    result.success = false;
    result.failureReason = error.message;
  }

  logReminderEvent({
    creatorId: reminder.creator_id,
    guildId: reminder.guild_id,
    reminderId: reminder.id,
    recipientId: result.recipientId,
    recipientRoleId: result.recipientRoleId,
    recipientChannelId: result.recipientChannelId,
    deliveryTime: new Date(reminder.delivery_timestamp).toISOString(),
    status: result.status,
    success: result.success,
    failureReason: result.failureReason,
  });

  const nextRun = parseRepeat(reminder.delivery_timestamp, reminder.repeat_type);
  if (nextRun) {
    updateReminder(reminder.id, {
      ...reminder,
      delivery_timestamp: nextRun,
      next_run: nextRun,
      status: 'active',
    });
  } else {
    updateReminder(reminder.id, {
      ...reminder,
      status: 'completed',
      next_run: reminder.delivery_timestamp,
    });
  }
}

async function runScheduler(client) {
  const reminders = getActiveReminders();
  for (const reminder of reminders) {
    await deliverReminder(client, reminder);
  }
}

function startScheduler(client) {
  setInterval(() => {
    runScheduler(client).catch((error) => logger.error(`Reminder scheduler failed: ${error.message}`));
  }, 60 * 1000);

  runScheduler(client).catch((error) => logger.error(`Reminder scheduler startup failed: ${error.message}`));
}

module.exports = { startScheduler, deliverReminder, parseRepeat };
