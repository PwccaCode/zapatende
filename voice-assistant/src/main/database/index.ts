/**
 * Database module for voice assistant
 * Exports all database functions and types
 */

// Initialization
export { initDatabase, getDatabase, closeDatabase, resetDatabase } from './init';

// Call management
export {
  createCall,
  updateCall,
  getCall,
  getCalls,
  getActiveCalls,
  deleteCall,
  addMessage,
  getMessage,
  getTranscript,
  getCallWithTranscript,
  deleteMessage,
} from './calls';

// Settings management
export {
  getSetting,
  setSetting,
  getAllSettings,
  getSettingsArray,
  deleteSetting,
  hasSetting,
} from './settings';

// Types
export type {
  Call,
  Message,
  Setting,
  TransferTemplate,
  CreateCallInput,
  UpdateCallInput,
  CreateMessageInput,
  CallStatus,
  MessageRole,
} from './types';
