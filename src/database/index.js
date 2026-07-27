const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

let Database;
try {
  Database = require('better-sqlite3');
} catch {
  Database = null;
}

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data', 'staff-manager.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

class FallbackDatabase {
  constructor(filePath) {
    this.filePath = filePath;
    this.tables = {};
    this.knownTables = ['guild_configs', 'ticket_configs', 'ticket_logs', 'ticket_daily_counts'];
    this.load();
  }

  load() {
    if (fs.existsSync(this.filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        this.tables = data.tables || {};
      } catch {
        this.tables = {};
      }
    }
    this.knownTables.forEach((table) => this.ensureTable(table));
  }

  save() {
    fs.writeFileSync(this.filePath, JSON.stringify({ tables: this.tables }, null, 2), 'utf8');
  }

  ensureTable(tableName) {
    if (!this.tables[tableName]) {
      this.tables[tableName] = [];
    }
  }

  exec(sql) {
    const createTableRegex = /CREATE TABLE IF NOT EXISTS\s+(\w+)/gi;
    let match;
    let created = false;
    while ((match = createTableRegex.exec(sql)) !== null) {
      const [, tableName] = match;
      this.ensureTable(tableName);
      created = true;
    }
    if (created) {
      this.save();
    }
    return this;
  }

  prepare(sql) {
    const normalized = sql.replace(/\s+/g, ' ').trim();
    return {
      run: (...args) => this.run(normalized, args),
      get: (...args) => this.get(normalized, args),
      all: (...args) => this.all(normalized, args),
    };
  }

  run(sql, args) {
    const normalized = sql.replace(/\s+/g, ' ').trim();
    const insertMatch = normalized.match(/^INSERT(?: OR (IGNORE|REPLACE))? INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\);?$/i);
    if (insertMatch) {
      const [, mode, tableName, columns] = insertMatch;
      this.ensureTable(tableName);
      const columnList = columns.split(',').map((item) => item.trim());
      const row = {};
      columnList.forEach((column, index) => {
        row[column] = args[index];
      });
      if (mode === 'IGNORE' && this.tables[tableName].some((item) => item.guild_id === row.guild_id)) {
        return { changes: 0, lastInsertRowid: null };
      }
      if (mode === 'REPLACE' && this.tables[tableName].some((item) => item.guild_id === row.guild_id)) {
        this.tables[tableName] = this.tables[tableName].filter((item) => item.guild_id !== row.guild_id);
      }
      this.tables[tableName].push(row);
      this.save();
      return { changes: 1, lastInsertRowid: this.tables[tableName].length };
    }

    const updateMatch = normalized.match(/^UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+?);?$/i);
    if (updateMatch) {
      const [, tableName, setClause, whereClause] = updateMatch;
      this.ensureTable(tableName);
      const conditions = whereClause.split(/\s+AND\s+/i).map((cond) => cond.trim());
      const whereValues = args.slice(args.length - conditions.length);
      const row = this.tables[tableName].find((item) => conditions.every((cond, index) => {
        const column = cond.replace(/\s*=\s*\?$/, '').trim();
        return item[column] === whereValues[index];
      }));
      if (row) {
        const setParts = setClause.split(',').map((part) => part.trim());
        const setValues = args.slice(0, args.length - conditions.length);
        setParts.forEach((part, index) => {
          const column = part.replace(/\s*=\s*\?$/, '').trim();
          row[column] = setValues[index];
        });
      }
      this.save();
      return { changes: row ? 1 : 0, lastInsertRowid: null };
    }

    const deleteMatch = sql.match(/^DELETE FROM (\w+) WHERE (.+?) = \?$/i);
    if (deleteMatch) {
      const [, tableName, whereColumn] = deleteMatch;
      this.ensureTable(tableName);
      this.tables[tableName] = this.tables[tableName].filter((item) => item[whereColumn] !== args[0]);
      this.save();
      return { changes: 1, lastInsertRowid: null };
    }

    return { changes: 0, lastInsertRowid: null };
  }

  get(sql, args) {
    const normalized = sql.replace(/\s+/g, ' ').trim();
    const selectMatch = normalized.match(/^SELECT\s+(.+?)\s+FROM\s+(\w+)\s+WHERE\s+(.+)$/i);
    if (selectMatch) {
      const [, selectedColumns, tableName, whereClause] = selectMatch;
      this.ensureTable(tableName);
      const conditions = whereClause.split(/\s+AND\s+/i).map((cond) => cond.trim());
      const row = this.tables[tableName].find((item) => conditions.every((cond, index) => {
        const column = cond.replace(/\s*=\s*\?$/, '').trim();
        return item[column] === args[index];
      }));
      if (!row) return undefined;
      if (selectedColumns === '*') return row;
      return { [selectedColumns.trim()]: row[selectedColumns.trim()] };
    }
    return undefined;
  }

  all(sql, args) {
    const normalized = sql.replace(/\s+/g, ' ').trim();

    const selectMatch = normalized.match(/^SELECT\s+(.+?)\s+FROM\s+(\w+)\s+WHERE\s+(.+?)$/i);
    if (selectMatch) {
      const [, selectedColumns, tableName, whereClause] = selectMatch;
      this.ensureTable(tableName);
      const conditions = whereClause.split(/\s+AND\s+/i).map((cond) => cond.trim());
      return this.tables[tableName].filter((item) => conditions.every((cond, index) => {
        const column = cond.replace(/\s*=\s*\?$/, '').trim();
        return item[column] === args[index];
      }));
    }

    return [];
  }

  pragma() {}
  close() {}
}

const dbFile = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data', 'staff-manager.db');
const fallbackDbFile = dbFile.endsWith('.db') ? dbFile.replace(/\.db$/, '.json') : `${dbFile}.json`;
let db;

if (Database) {
  try {
    db = new Database(dbFile);
    db.pragma('journal_mode = WAL');
  } catch (error) {
    logger.warn(`Falling back to JSON storage: ${error.message}`);
    db = new FallbackDatabase(fallbackDbFile);
  }
} else {
  db = new FallbackDatabase(fallbackDbFile);
}

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_configs (
      guild_id TEXT PRIMARY KEY,
      staff_channel_id TEXT,
      prefix TEXT DEFAULT '!',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ticket_configs (
      guild_id TEXT PRIMARY KEY,
      category_id TEXT,
      panel_id TEXT,
      logs_id TEXT,
      support_role_ids TEXT,
      daily_ticket_limit INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ticket_daily_counts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      ticket_count INTEGER DEFAULT 0,
      last_ticket_timestamp TEXT,
      reset_date TEXT,
      UNIQUE (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS ticket_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      ticket_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );
  `);

  if (Database) {
    try {
      const columns = db.prepare("PRAGMA table_info(ticket_configs)").all().map((col) => col.name);
      if (!columns.includes('daily_ticket_limit')) {
        db.prepare('ALTER TABLE ticket_configs ADD COLUMN daily_ticket_limit INTEGER DEFAULT 1').run();
      }
    } catch (error) {
      logger.warn(`Ticket config migration skipped: ${error.message}`);
    }
  }

  logger.info('Database initialized');
}

initializeDatabase();

module.exports = { db, initializeDatabase };
