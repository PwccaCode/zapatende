import { getDatabase } from './init';
import type { Setting } from './types';

/**
 * Get a setting value by key
 */
export function getSetting(key: string): string | null {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT value FROM settings WHERE key = ?
  `);

  const row = stmt.get(key) as any;
  
  if (!row) {
    return null;
  }

  return row.value;
}

/**
 * Set a setting value (insert or update)
 */
export function setSetting(key: string, value: string): void {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  stmt.run(key, value);
}

/**
 * Get all settings as key-value pairs
 */
export function getAllSettings(): Record<string, string> {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT key, value FROM settings
  `);

  const rows = stmt.all() as Setting[];
  
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  
  return settings;
}

/**
 * Get all settings as an array
 */
export function getSettingsArray(): Setting[] {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT key, value FROM settings ORDER BY key
  `);

  return stmt.all() as Setting[];
}

/**
 * Delete a setting by key
 */
export function deleteSetting(key: string): boolean {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    DELETE FROM settings WHERE key = ?
  `);

  const result = stmt.run(key);
  return result.changes > 0;
}

/**
 * Check if a setting exists
 */
export function hasSetting(key: string): boolean {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM settings WHERE key = ?
  `);

  const row = stmt.get(key) as any;
  return row.count > 0;
}
