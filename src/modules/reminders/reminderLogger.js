const { db } = require('../../database');
const logger = require('../../utils/logger');

function logReminderEvent(data) {
  const entry = {
    creator_id: data.creatorId,
    guild_id: data.guildId,
    reminder_id: data.reminderId,
    recipient_id: data.recipientId || null,
    recipient_role_id: data.recipientRoleId || null,
    recipient_channel_id: data.recipientChannelId || null,
    delivery_time: data.deliveryTime,
    status: data.status,
    success: data.success ? 1 : 0,
    failure_reason: data.failureReason || null,
    created_at: new Date().toISOString(),
  };

  try {
    if (db.prepare) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS reminder_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          creator_id TEXT,
          guild_id TEXT,
          reminder_id INTEGER,
          recipient_id TEXT,
          recipient_role_id TEXT,
          recipient_channel_id TEXT,
          delivery_time TEXT,
          status TEXT,
          success INTEGER,
          failure_reason TEXT,
          created_at TEXT
        );
      `);
    }
    db.prepare(`INSERT INTO reminder_logs (
      creator_id, guild_id, reminder_id, recipient_id, recipient_role_id, recipient_channel_id,
      delivery_time, status, success, failure_reason, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(
        entry.creator_id,
        entry.guild_id,
        entry.reminder_id,
        entry.recipient_id,
        entry.recipient_role_id,
        entry.recipient_channel_id,
        entry.delivery_time,
        entry.status,
        entry.success,
        entry.failure_reason,
        entry.created_at,
      );
  } catch (error) {
    logger.error(`Reminder log failed: ${error.message}`);
  }
}

module.exports = { logReminderEvent };
