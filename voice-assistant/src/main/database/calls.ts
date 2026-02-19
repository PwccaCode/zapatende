import Database from 'better-sqlite3';
import { getDatabase } from './init';
import type { Call, Message, CreateCallInput, UpdateCallInput, CreateMessageInput, CallStatus } from './types';

/**
 * Create a new call record
 */
export function createCall(input: CreateCallInput): Call {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    INSERT INTO calls (id, chat_id, contact_name, phone_number, started_at, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `);

  const now = input.started_at || new Date();
  stmt.run(input.id, input.chat_id, input.contact_name || null, input.phone_number || null, now.toISOString());

  return getCall(input.id)!;
}

/**
 * Update an existing call
 */
export function updateCall(callId: string, updates: UpdateCallInput): Call | null {
  const db = getDatabase();
  
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.ended_at !== undefined) {
    fields.push('ended_at = ?');
    values.push(updates.ended_at.toISOString());
  }
  if (updates.duration_seconds !== undefined) {
    fields.push('duration_seconds = ?');
    values.push(updates.duration_seconds);
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.end_reason !== undefined) {
    fields.push('end_reason = ?');
    values.push(updates.end_reason);
  }

  if (fields.length === 0) {
    return getCall(callId);
  }

  values.push(callId);

  const stmt = db.prepare(`
    UPDATE calls
    SET ${fields.join(', ')}
    WHERE id = ?
  `);

  stmt.run(...values);

  return getCall(callId);
}

/**
 * Get a call by ID
 */
export function getCall(callId: string): Call | null {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT * FROM calls WHERE id = ?
  `);

  const row = stmt.get(callId) as any;
  
  if (!row) {
    return null;
  }

  return rowToCall(row);
}

/**
 * Get all calls, optionally filtered by status
 */
export function getCalls(status?: CallStatus): Call[] {
  const db = getDatabase();
  
  let stmt: Database.Statement;
  if (status) {
    stmt = db.prepare(`
      SELECT * FROM calls WHERE status = ? ORDER BY started_at DESC
    `);
    const rows = stmt.all(status) as any[];
    return rows.map(rowToCall);
  } else {
    stmt = db.prepare(`
      SELECT * FROM calls ORDER BY started_at DESC
    `);
    const rows = stmt.all() as any[];
    return rows.map(rowToCall);
  }
}

/**
 * Get active calls
 */
export function getActiveCalls(): Call[] {
  return getCalls('active');
}

/**
 * Delete a call and all its messages
 */
export function deleteCall(callId: string): boolean {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    DELETE FROM calls WHERE id = ?
  `);

  const result = stmt.run(callId);
  return result.changes > 0;
}

/**
 * Add a message to a call
 */
export function addMessage(input: CreateMessageInput): Message {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    INSERT INTO messages (id, call_id, role, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const now = input.created_at || new Date();
  stmt.run(input.id, input.call_id, input.role, input.content, now.toISOString());

  return getMessage(input.id)!;
}

/**
 * Get a message by ID
 */
export function getMessage(messageId: string): Message | null {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT * FROM messages WHERE id = ?
  `);

  const row = stmt.get(messageId) as any;
  
  if (!row) {
    return null;
  }

  return rowToMessage(row);
}

/**
 * Get all messages for a call (transcript)
 */
export function getTranscript(callId: string): Message[] {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT * FROM messages WHERE call_id = ? ORDER BY created_at ASC
  `);

  const rows = stmt.all(callId) as any[];
  return rows.map(rowToMessage);
}

/**
 * Get a call with its transcript
 */
export function getCallWithTranscript(callId: string): { call: Call; messages: Message[] } | null {
  const call = getCall(callId);
  
  if (!call) {
    return null;
  }

  const messages = getTranscript(callId);

  return { call, messages };
}

/**
 * Delete a message
 */
export function deleteMessage(messageId: string): boolean {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    DELETE FROM messages WHERE id = ?
  `);

  const result = stmt.run(messageId);
  return result.changes > 0;
}

/**
 * Convert database row to Call object
 */
function rowToCall(row: any): Call {
  return {
    id: row.id,
    chat_id: row.chat_id,
    contact_name: row.contact_name || undefined,
    phone_number: row.phone_number || undefined,
    started_at: new Date(row.started_at),
    ended_at: row.ended_at ? new Date(row.ended_at) : undefined,
    duration_seconds: row.duration_seconds || undefined,
    status: row.status,
    end_reason: row.end_reason || undefined,
  };
}

/**
 * Convert database row to Message object
 */
function rowToMessage(row: any): Message {
  return {
    id: row.id,
    call_id: row.call_id,
    role: row.role,
    content: row.content,
    created_at: new Date(row.created_at),
  };
}
