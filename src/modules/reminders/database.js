const { db } = require('../../database');
const logger = require('../../utils/logger');

function initializeRemindersTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      creator_id TEXT NOT NULL,
      type TEXT NOT NULL,
      recipient_user_id TEXT,
      recipient_role_id TEXT,
      recipient_channel_id TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata TEXT,
      delivery_timestamp INTEGER NOT NULL,
      repeat_type TEXT NOT NULL,
      next_run INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  if (db.prepare) {
    try {
      const columns = db.prepare("PRAGMA table_info(reminders)").all().map((col) => col.name);
      if (!columns.includes('metadata')) {
        db.prepare('ALTER TABLE reminders ADD COLUMN metadata TEXT').run();
      }
      if (!columns.includes('status')) {
        db.prepare('ALTER TABLE reminders ADD COLUMN status TEXT NOT NULL DEFAULT \'active\'').run();
      }
      if (!columns.includes('next_run')) {
        db.prepare('ALTER TABLE reminders ADD COLUMN next_run INTEGER NOT NULL').run();
      }
    } catch (error) {
      logger.warn(`Reminder table migration skipped: ${error.message}`);
    }
  }
}

function getActiveReminders() {
  return db.prepare('SELECT * FROM reminders WHERE status = ? AND next_run <= ?').all('active', Date.now());
}

function getUpcomingReminders(guildId, threshold) {
  return db.prepare('SELECT * FROM reminders WHERE guild_id = ? AND status = ? AND next_run <= ? ORDER BY next_run ASC').all(guildId, 'active', threshold);
}

function getReminderById(id) {
  return db.prepare('SELECT * FROM reminders WHERE id = ?').get(id);
}

function getGuildReminders(guildId, offset, limit) {
  return db.prepare('SELECT * FROM reminders WHERE guild_id = ? ORDER BY next_run ASC LIMIT ? OFFSET ?').all(guildId, limit, offset);
}

function countGuildReminders(guildId) {
  return db.prepare('SELECT COUNT(*) as count FROM reminders WHERE guild_id = ?').get(guildId).count || 0;
}

function createReminder(data) {
  return db.prepare(`INSERT INTO reminders (
    guild_id, creator_id, type, recipient_user_id, recipient_role_id, recipient_channel_id,
    title, message, metadata, delivery_timestamp, repeat_type, next_run, status, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
    .run(
      data.guild_id,
      data.creator_id,
      data.type,
      data.recipient_user_id || null,
      data.recipient_role_id || null,
      data.recipient_channel_id || null,
      data.title,
      data.message,
      JSON.stringify(data.metadata || {}),
      data.delivery_timestamp,
      data.repeat_type,
      data.next_run,
      'active',
    );
}

function updateReminder(id, data) {
  return db.prepare(`UPDATE reminders SET
    type = ?,
    recipient_user_id = ?,
    recipient_role_id = ?,
    recipient_channel_id = ?,
    title = ?,
    message = ?,
    metadata = ?,
    delivery_timestamp = ?,
    repeat_type = ?,
    next_run = ?,
    status = ?,
    updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    data.type,
    data.recipient_user_id || null,
    data.recipient_role_id || null,
    data.recipient_channel_id || null,
    data.title,
    data.message,
    JSON.stringify(data.metadata || {}),
    data.delivery_timestamp,
    data.repeat_type,
    data.next_run,
    data.status || 'active',
    id,
  );
}

function deleteReminder(id) {
  return db.prepare('DELETE FROM reminders WHERE id = ?').run(id);
}

function deleteReminders(ids) {
  const statement = db.prepare(`DELETE FROM reminders WHERE id IN (${ids.map(() => '?').join(',')})`);
  return statement.run(...ids);
}

module.exports = {
  initializeRemindersTable,
  getActiveReminders,
  getUpcomingReminders,
  getReminderById,
  getGuildReminders,
  countGuildReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  deleteReminders,
};
