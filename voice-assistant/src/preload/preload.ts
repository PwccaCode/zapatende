// See https://www.electronjs.org/docs/latest/tutorial/tutorial-preload
import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Voice Loop Control
  voiceLoop: {
    start: () => ipcRenderer.invoke('voice-loop:start'),
    pause: () => ipcRenderer.invoke('voice-loop:pause'),
    resume: () => ipcRenderer.invoke('voice-loop:resume'),
    reset: () => ipcRenderer.invoke('voice-loop:reset'),
    getState: () => ipcRenderer.invoke('voice-loop:get-state'),
    getStats: () => ipcRenderer.invoke('voice-loop:get-stats'),
    getTakeoverState: () => ipcRenderer.invoke('voice-loop:get-takeover-state'),
    triggerTakeover: (trigger: string, reason: string) => ipcRenderer.invoke('voice-loop:trigger-takeover', trigger, reason),
    cancelTakeover: (reason: string) => ipcRenderer.invoke('voice-loop:cancel-takeover', reason),
    updateConfig: (config: Record<string, any>) => ipcRenderer.invoke('voice-loop:update-config', config),
    onStateChange: (callback: (state: string) => void) => {
      const subscription = (_event: any, state: string) => callback(state);
      ipcRenderer.on('voice-loop:state-changed', subscription);
      return () => ipcRenderer.removeListener('voice-loop:state-changed', subscription);
    },
    onTranscription: (callback: (data: any) => void) => {
      const subscription = (_event: any, data: any) => callback(data);
      ipcRenderer.on('voice-loop:transcription', subscription);
      return () => ipcRenderer.removeListener('voice-loop:transcription', subscription);
    },
    onAIResponse: (callback: (data: any) => void) => {
      const subscription = (_event: any, data: any) => callback(data);
      ipcRenderer.on('voice-loop:ai-response', subscription);
      return () => ipcRenderer.removeListener('voice-loop:ai-response', subscription);
    },
    onHumanTakeover: (callback: (data: any) => void) => {
      const subscription = (_event: any, data: any) => callback(data);
      ipcRenderer.on('voice-loop:human-takeover', subscription);
      return () => ipcRenderer.removeListener('voice-loop:human-takeover', subscription);
    },
  },
  
  // Settings
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:get-all'),
    delete: (key: string) => ipcRenderer.invoke('settings:delete', key),
    has: (key: string) => ipcRenderer.invoke('settings:has', key),
  },
  
  // Calls
  calls: {
    create: (input: any) => ipcRenderer.invoke('calls:create', input),
    get: (id: string) => ipcRenderer.invoke('calls:get', id),
    getActive: () => ipcRenderer.invoke('calls:get-active'),
    update: (id: string, updates: any) => ipcRenderer.invoke('calls:update', id, updates),
    getRecent: (limit?: number) => ipcRenderer.invoke('calls:get-recent', limit),
  },
  
  // Messages
  messages: {
    create: (input: any) => ipcRenderer.invoke('messages:create', input),
    getForCall: (callId: string) => ipcRenderer.invoke('messages:get-for-call', callId),
  },
  
  // WhatsApp
  whatsapp: {
    getStatus: () => ipcRenderer.invoke('whatsapp:get-status'),
    connect: () => ipcRenderer.invoke('whatsapp:connect'),
    disconnect: () => ipcRenderer.invoke('whatsapp:disconnect'),
    getQR: () => ipcRenderer.invoke('whatsapp:get-qr'),
    onStatusChange: (callback: (status: string) => void) => {
      const subscription = (_event: any, status: string) => callback(status);
      ipcRenderer.on('whatsapp:status-changed', subscription);
      return () => ipcRenderer.removeListener('whatsapp:status-changed', subscription);
    },
    onQRCode: (callback: (qrCode: string) => void) => {
      const subscription = (_event: any, qrCode: string) => callback(qrCode);
      ipcRenderer.on('whatsapp:qr-code', subscription);
      return () => ipcRenderer.removeListener('whatsapp:qr-code', subscription);
    },
  },
});

// Type declaration for the exposed API
export interface ElectronAPI {
  voiceLoop: {
    start: () => Promise<{ success: boolean }>;
    pause: () => Promise<{ success: boolean }>;
    resume: () => Promise<{ success: boolean }>;
    reset: () => Promise<{ success: boolean }>;
    getState: () => Promise<{ success: boolean; state: string }>;
    getStats: () => Promise<{ success: boolean; stats: any }>;
    getTakeoverState: () => Promise<{ success: boolean; takeoverState: any }>;
    triggerTakeover: (trigger: string, reason: string) => Promise<{ success: boolean }>;
    cancelTakeover: (reason: string) => Promise<{ success: boolean }>;
    updateConfig: (config: Record<string, any>) => Promise<{ success: boolean }>;
    onStateChange: (callback: (state: string) => void) => () => void;
    onTranscription: (callback: (data: any) => void) => () => void;
    onAIResponse: (callback: (data: any) => void) => () => void;
    onHumanTakeover: (callback: (data: any) => void) => () => void;
  };
  settings: {
    get: (key: string) => Promise<{ success: boolean; value?: string }>;
    set: (key: string, value: string) => Promise<{ success: boolean }>;
    getAll: () => Promise<{ success: boolean; settings: Record<string, string> }>;
    delete: (key: string) => Promise<{ success: boolean; deleted: boolean }>;
    has: (key: string) => Promise<{ success: boolean; exists: boolean }>;
  };
  calls: {
    create: (input: any) => Promise<{ success: boolean; call?: any }>;
    get: (id: string) => Promise<{ success: boolean; call?: any }>;
    getActive: () => Promise<{ success: boolean; calls: any[] }>;
    update: (id: string, updates: any) => Promise<{ success: boolean; call?: any }>;
    getRecent: (limit?: number) => Promise<{ success: boolean; calls: any[] }>;
  };
  messages: {
    create: (input: any) => Promise<{ success: boolean; message?: any }>;
    getForCall: (callId: string) => Promise<{ success: boolean; messages: any[] }>;
  };
  whatsapp: {
    getStatus: () => Promise<{ success: boolean; status: string }>;
    connect: () => Promise<{ success: boolean; message?: string }>;
    disconnect: () => Promise<{ success: boolean }>;
    getQR: () => Promise<{ success: boolean; qrCode: string | null }>;
    onStatusChange: (callback: (status: string) => void) => () => void;
    onQRCode: (callback: (qrCode: string) => void) => () => void;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
