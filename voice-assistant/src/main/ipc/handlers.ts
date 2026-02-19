/**
 * IPC Handlers for Voice Assistant
 * Handles communication between main and renderer processes
 */

import { ipcMain } from 'electron';
import { VoiceLoopEngine } from '../voice-loop';
import { 
  getSetting, 
  setSetting, 
  getAllSettings, 
  getSettingsArray,
  deleteSetting,
  hasSetting,
} from '../database/settings';
import {
  createCall,
  getCall,
  getActiveCalls,
  updateCall,
  getCalls,
  getTranscript,
} from '../database/calls';
import { getDatabase } from '../database/init';

/**
 * Helper to safely call database operations
 */
function safeDbCall<T>(fn: () => T): { success: boolean; data?: T; error?: string } {
  try {
    // Check if database is initialized
    getDatabase();
    const result = fn();
    return { success: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

/**
 * IPC Handler error class
 */
export class IPCHandlerError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'IPCHandlerError';
  }
}

/**
 * IPC Handler options
 */
export interface IPCHandlersOptions {
  voiceLoopEngine: VoiceLoopEngine;
}

/**
 * Register all IPC handlers
 */
export function registerIPCHandlers(options: IPCHandlersOptions): void {
  const { voiceLoopEngine } = options;

  // Voice Loop Control Handlers
  ipcMain.handle('voice-loop:start', async () => {
    voiceLoopEngine.start();
    return { success: true };
  });

  ipcMain.handle('voice-loop:pause', async () => {
    voiceLoopEngine.pause();
    return { success: true };
  });

  ipcMain.handle('voice-loop:resume', async () => {
    voiceLoopEngine.resume();
    return { success: true };
  });

  ipcMain.handle('voice-loop:reset', async () => {
    voiceLoopEngine.reset();
    return { success: true };
  });

  ipcMain.handle('voice-loop:get-state', async () => {
    const state = voiceLoopEngine.getState();
    return { success: true, state };
  });

  ipcMain.handle('voice-loop:get-stats', async () => {
    const stats = voiceLoopEngine.getStats();
    return { success: true, stats };
  });

  ipcMain.handle('voice-loop:get-takeover-state', async () => {
    const takeoverState = voiceLoopEngine.getTakeoverState();
    return { success: true, takeoverState };
  });

  ipcMain.handle('voice-loop:trigger-takeover', async (_event, trigger: string, reason: string) => {
    voiceLoopEngine.triggerHumanTakeover(trigger as any, reason);
    return { success: true };
  });

  ipcMain.handle('voice-loop:cancel-takeover', async (_event, reason: string) => {
    voiceLoopEngine.cancelHumanTakeover(reason);
    return { success: true };
  });

  ipcMain.handle('voice-loop:update-config', async (_event, config: Record<string, any>) => {
    voiceLoopEngine.updateConfig(config);
    return { success: true };
  });

  // Settings Handlers
  ipcMain.handle('settings:get', async (_event, key: string) => {
    const result = safeDbCall(() => getSetting(key));
    return result.success 
      ? { success: true, value: result.data }
      : { success: false, error: result.error };
  });

  ipcMain.handle('settings:set', async (_event, key: string, value: string) => {
    const result = safeDbCall(() => setSetting(key, value));
    return result.success 
      ? { success: true }
      : { success: false, error: result.error };
  });

  ipcMain.handle('settings:get-all', async () => {
    const result = safeDbCall(() => getAllSettings());
    return result.success 
      ? { success: true, settings: result.data }
      : { success: false, error: result.error };
  });

  ipcMain.handle('settings:get-array', async () => {
    const result = safeDbCall(() => getSettingsArray());
    return result.success 
      ? { success: true, settings: result.data }
      : { success: false, error: result.error };
  });

  ipcMain.handle('settings:delete', async (_event, key: string) => {
    const result = safeDbCall(() => deleteSetting(key));
    return result.success 
      ? { success: true, deleted: result.data }
      : { success: false, error: result.error };
  });

  ipcMain.handle('settings:has', async (_event, key: string) => {
    const result = safeDbCall(() => hasSetting(key));
    return result.success 
      ? { success: true, exists: result.data }
      : { success: false, error: result.error };
  });

  // Call Handlers
  ipcMain.handle('calls:create', async (_event, input: any) => {
    const result = safeDbCall(() => createCall(input));
    return result.success 
      ? { success: true, call: result.data }
      : { success: false, error: result.error };
  });

  ipcMain.handle('calls:get', async (_event, id: string) => {
    const result = safeDbCall(() => getCall(id));
    if (!result.success) {
      return { success: false, error: result.error };
    }
    if (!result.data) {
      return { success: false, error: 'Call not found' };
    }
    return { success: true, call: result.data };
  });

  ipcMain.handle('calls:get-active', async () => {
    const result = safeDbCall(() => getActiveCalls());
    return result.success 
      ? { success: true, calls: result.data }
      : { success: false, error: result.error };
  });

  ipcMain.handle('calls:update', async (_event, id: string, updates: any) => {
    const result = safeDbCall(() => updateCall(id, updates));
    if (!result.success) {
      return { success: false, error: result.error };
    }
    if (!result.data) {
      return { success: false, error: 'Call not found' };
    }
    return { success: true, call: result.data };
  });

  ipcMain.handle('calls:get-recent', async (_event, limit?: number) => {
    const result = safeDbCall(() => getCalls());
    if (!result.success) {
      return { success: false, error: result.error };
    }
    const calls = result.data || [];
    return { success: true, calls: limit ? calls.slice(0, limit) : calls };
  });

  // Message Handlers
  ipcMain.handle('messages:get-for-call', async (_event, callId: string) => {
    const result = safeDbCall(() => getTranscript(callId));
    return result.success 
      ? { success: true, messages: result.data }
      : { success: false, error: result.error };
  });

  // WhatsApp Session Handlers (placeholders for wppconnect integration)
  ipcMain.handle('whatsapp:get-status', async () => {
    // This will be implemented when wppconnect integration is ready
    return { success: true, status: 'disconnected' };
  });

  ipcMain.handle('whatsapp:connect', async () => {
    // This will be implemented when wppconnect integration is ready
    return { success: true, message: 'Not yet implemented' };
  });

  ipcMain.handle('whatsapp:disconnect', async () => {
    // This will be implemented when wppconnect integration is ready
    return { success: true };
  });

  ipcMain.handle('whatsapp:get-qr', async () => {
    // This will be implemented when wppconnect integration is ready
    return { success: true, qrCode: null };
  });

  console.log('IPC handlers registered successfully');
}

/**
 * Unregister all IPC handlers
 */
export function unregisterIPCHandlers(): void {
  const handlers = [
    'voice-loop:start',
    'voice-loop:pause',
    'voice-loop:resume',
    'voice-loop:reset',
    'voice-loop:get-state',
    'voice-loop:get-stats',
    'voice-loop:get-takeover-state',
    'voice-loop:trigger-takeover',
    'voice-loop:cancel-takeover',
    'voice-loop:update-config',
    'settings:get',
    'settings:set',
    'settings:get-all',
    'settings:get-array',
    'settings:delete',
    'settings:has',
    'calls:create',
    'calls:get',
    'calls:get-active',
    'calls:update',
    'calls:get-recent',
    'messages:create',
    'messages:get-for-call',
    'whatsapp:get-status',
    'whatsapp:connect',
    'whatsapp:disconnect',
    'whatsapp:get-qr',
  ];

  handlers.forEach(handler => {
    ipcMain.removeHandler(handler);
  });

  console.log('IPC handlers unregistered');
}
