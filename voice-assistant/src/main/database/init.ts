import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database | null = null;

/**
 * Initialize the SQLite database and create schema
 */
export function initDatabase(): Database.Database {
  if (db) {
    return db;
  }

  // Get the user data directory for the Electron app
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'voice-assistant.db');

  // Create database connection
  db = new Database(dbPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create schema
  createTables(db);

  return db;
}

/**
 * Get the database instance (must call initDatabase first)
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Create all database tables
 */
function createTables(database: Database.Database): void {
  // Create calls table
  database.exec(`
    CREATE TABLE IF NOT EXISTS calls (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      contact_name TEXT,
      phone_number TEXT,
      started_at DATETIME NOT NULL,
      ended_at DATETIME,
      duration_seconds INTEGER,
      status TEXT CHECK(status IN ('active', 'ended', 'transferred')) NOT NULL DEFAULT 'active',
      end_reason TEXT
    )
  `);

  // Create messages table
  database.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      call_id TEXT NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
      role TEXT CHECK(role IN ('caller', 'ai', 'human')) NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME NOT NULL
    )
  `);

  // Create settings table
  database.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Create transfer_templates table
  database.exec(`
    CREATE TABLE IF NOT EXISTS transfer_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      message TEXT NOT NULL,
      is_default BOOLEAN DEFAULT 0
    )
  `);

  // Create indexes for better query performance
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_call_id ON messages(call_id);
    CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
    CREATE INDEX IF NOT EXISTS idx_calls_started_at ON calls(started_at);
  `);
}

/**
 * Reset the database (drop all tables and recreate schema)
 * WARNING: This will delete all data
 */
export function resetDatabase(): void {
  const database = getDatabase();
  
  database.exec(`
    DROP TABLE IF EXISTS messages;
    DROP TABLE IF EXISTS calls;
    DROP TABLE IF EXISTS settings;
    DROP TABLE IF EXISTS transfer_templates;
  `);
  
  createTables(database);
}
