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
    const createMatch = sql.match(/CREATE TABLE IF NOT EXISTS\s+(\w+)/i);
    if (createMatch) {
      const [, tableName] = createMatch;
      this.ensureTable(tableName);
      this.save();
      return this;
    }
    return this;
  }

  prepare(sql) {
    const normalized = sql.trim();
    return {
      run: (...args) => this.run(normalized, args),
      get: (...args) => this.get(normalized, args),
      all: (...args) => this.all(normalized, args),
    };
  }

  run(sql, args) {
    const insertMatch = sql.match(/^INSERT(?: OR (IGNORE|REPLACE))? INTO (\w+) \((.*?)\) VALUES \((.*?)\)/i);
    if (insertMatch) {
      const [, mode, tableName, columns, values] = insertMatch;
      this.ensureTable(tableName);
      const columnList = columns.split(',').map((item) => item.trim());
      const valueList = values.split(',').map((item) => item.trim());
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

    const updateMatch = sql.match(/^UPDATE (\w+) SET (.+?) WHERE (.+?) = \?$/i);
    if (updateMatch) {
      const [, tableName, setClause, whereColumn] = updateMatch;
      this.ensureTable(tableName);
      const row = this.tables[tableName].find((item) => item[whereColumn] === args[0]);
      if (row) {
        if (setClause.includes('updated_at')) {
          row.updated_at = new Date().toISOString();
        } else if (setClause.includes('edited')) {
          row.edited = 1;
        } else if (setClause.includes('deleted')) {
          row.deleted = 1;
        }
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
    const selectMatch = sql.match(/^SELECT (.+?) FROM (\w+) WHERE (.+?) = \?$/i);
    if (selectMatch) {
      const [, selectedColumns, tableName, whereColumn] = selectMatch;
      this.ensureTable(tableName);
      const row = this.tables[tableName].find((item) => item[whereColumn] === args[0]);
      if (!row) return undefined;
      if (selectedColumns === '*') return row;
      return { [selectedColumns.trim()]: row[selectedColumns.trim()] };
    }
    return undefined;
  }

  all(sql, args) {
    const selectMatch = sql.match(/^SELECT (.+?) FROM (\w+) WHERE (.+?) = \?$/i);
    if (selectMatch) {
      const [, selectedColumns, tableName, whereColumn] = selectMatch;
      this.ensureTable(tableName);
      return this.tables[tableName].filter((item) => item[whereColumn] === args[0]);
    }

    const analyticMatch = sql.match(/^SELECT (.+) FROM analytics WHERE guild_id = \? AND channel_id = \?(?: AND timestamp >= \? AND timestamp < \?)? GROUP BY author_id ORDER BY messages DESC LIMIT 50$/i);
    if (analyticMatch) {
      const table = this.tables.analytics || [];
      let filtered = table.filter((item) => item.guild_id === args[0] && item.channel_id === args[1]);
      if (args.length >= 4) {
        const start = args[2];
        const end = args[3];
        filtered = filtered.filter((item) => item.timestamp >= start && item.timestamp < end);
      }
      const aggregated = filtered.reduce((acc, item) => {
        if (!acc[item.author_id]) {
          acc[item.author_id] = { author_id: item.author_id, messages: 0, words: 0, images: 0, attachments: 0, links: 0 };
        }
        acc[item.author_id].messages += 1;
        acc[item.author_id].words += item.word_count || 0;
        acc[item.author_id].images += item.image_count || 0;
        acc[item.author_id].attachments += item.attachment_count || 0;
        acc[item.author_id].links += item.link_count || 0;
        return acc;
      }, {});
      return Object.values(aggregated).sort((a, b) => b.messages - a.messages).slice(0, 50);
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS message_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      word_count INTEGER DEFAULT 0,
      attachments INTEGER DEFAULT 0,
      images INTEGER DEFAULT 0,
      links INTEGER DEFAULT 0,
      edited INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      attachment_count INTEGER DEFAULT 0,
      image_count INTEGER DEFAULT 0,
      link_count INTEGER DEFAULT 0,
      word_count INTEGER DEFAULT 0,
      message_length INTEGER DEFAULT 0
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

  logger.info('Database initialized');
}

initializeDatabase();

module.exports = { db, initializeDatabase };
