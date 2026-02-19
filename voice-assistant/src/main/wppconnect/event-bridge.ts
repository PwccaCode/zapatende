/**
 * Event Bridge - Bridges wppconnect events to Electron IPC
 */

import { ipcMain, BrowserWindow } from 'electron';
import { WppConnectClient } from './client';
import { CallManager } from './call-manager';

/**
 * Event Bridge class
 * Connects wppconnect client and call manager events to IPC channels
 */
export class EventBridge {
  private client: WppConnectClient;
  private callManager: CallManager;
  private mainWindow: BrowserWindow | null = null;
  private eventListeners: Map<string, () => void> = new Map();

  constructor(client: WppConnectClient, callManager: CallManager) {
    this.client = client;
    this.callManager = callManager;
  }

  /**
   * Set the main browser window for IPC communication
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Setup IPC handlers for all events
   */
  setup(): void {
    this.setupSessionEvents();
    this.setupCallEvents();
    this.setupCommandHandlers();
  }

  /**
   * Setup session-related events
   */
  private setupSessionEvents(): void {
    // QR Code event
    const onQRCode = (data: unknown) => {
      this.sendToRenderer('session:qr', data);
    };
    this.client.on('session:qr', onQRCode);
    this.eventListeners.set('session:qr', () => {
      this.client.off('session:qr', onQRCode);
    });

    // Session status event
    const onStatus = (data: unknown) => {
      this.sendToRenderer('session:status', data);
    };
    this.client.on('session:status', onStatus);
    this.eventListeners.set('session:status', () => {
      this.client.off('session:status', onStatus);
    });

    // Session authenticated event
    const onAuthenticated = (data: any) => {
      this.sendToRenderer('session:authenticated', data);
    };
    this.client.on('session:authenticated', onAuthenticated);
    this.eventListeners.set('session:authenticated', () => {
      this.client.off('session:authenticated', onAuthenticated);
    });

    // Session loading event
    const onLoading = (data: any) => {
      this.sendToRenderer('session:loading', data);
    };
    this.client.on('session:loading', onLoading);
    this.eventListeners.set('session:loading', () => {
      this.client.off('session:loading', onLoading);
    });
  }

  /**
   * Setup call-related events
   */
  private setupCallEvents(): void {
    // Incoming call event
    const onIncomingCall = (data: unknown) => {
      this.sendToRenderer('call:incoming', data);
    };
    this.callManager.on('call:incoming', onIncomingCall);
    this.eventListeners.set('call:incoming', () => {
      this.callManager.off('call:incoming', onIncomingCall);
    });

    // Call answered event
    const onCallAnswered = (data: unknown) => {
      this.sendToRenderer('call:answered', data);
    };
    this.callManager.on('call:answered', onCallAnswered);
    this.eventListeners.set('call:answered', () => {
      this.callManager.off('call:answered', onCallAnswered);
    });

    // Call ended event
    const onCallEnded = (data: unknown) => {
      this.sendToRenderer('call:ended', data);
    };
    this.callManager.on('call:ended', onCallEnded);
    this.eventListeners.set('call:ended', () => {
      this.callManager.off('call:ended', onCallEnded);
    });

    // Audio chunk event
    const onAudioChunk = (data: any) => {
      this.sendToRenderer('call:audio-chunk', data);
    };
    this.callManager.on('call:audio-chunk', onAudioChunk);
    this.eventListeners.set('call:audio-chunk', () => {
      this.callManager.off('call:audio-chunk', onAudioChunk);
    });

    // Call state change event
    const onCallStateChange = (data: any) => {
      this.sendToRenderer('call:state-change', data);
    };
    this.callManager.on('call:state-change', onCallStateChange);
    this.eventListeners.set('call:state-change', () => {
      this.callManager.off('call:state-change', onCallStateChange);
    });

    // Call started event
    const onCallStarted = (data: any) => {
      this.sendToRenderer('call:started', data);
    };
    this.callManager.on('call:started', onCallStarted);
    this.eventListeners.set('call:started', () => {
      this.callManager.off('call:started', onCallStarted);
    });
  }

  /**
   * Setup IPC command handlers
   * These allow the renderer to request actions from the main process
   */
  private setupCommandHandlers(): void {
    // Get session status
    ipcMain.handle('wppconnect:get-status', () => {
      return {
        status: this.client.getStatus(),
        isReady: this.client.isReady(),
      };
    });

    // Get active calls
    ipcMain.handle('wppconnect:get-active-calls', () => {
      return this.callManager.getActiveCalls();
    });

    // Get call count
    ipcMain.handle('wppconnect:get-call-count', () => {
      return this.callManager.getActiveCallCount();
    });

    // Get specific call
    ipcMain.handle('wppconnect:get-call', (_event, callId: string) => {
      return this.callManager.getCall(callId);
    });

    // Take screenshot
    ipcMain.handle('wppconnect:screenshot', async () => {
      return await this.client.takeScreenshot();
    });

    // Logout
    ipcMain.handle('wppconnect:logout', async () => {
      await this.client.logout();
      return { success: true };
    });

    // Start call
    ipcMain.handle(
      'wppconnect:start-call',
      async (_event, options: any) => {
        try {
          const call = await this.callManager.startCall(options);
          return { success: true, call };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }
    );

    // End call
    ipcMain.handle('wppconnect:end-call', async (_event, callId: string) => {
      try {
        await this.callManager.endCall(callId);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    // Answer call
    ipcMain.handle('wppconnect:answer-call', async (_event, callId: string) => {
      try {
        await this.callManager.answerCall(callId);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    // Reject call
    ipcMain.handle('wppconnect:reject-call', async (_event, callId: string) => {
      try {
        await this.callManager.rejectCall(callId);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    // Send audio to call
    ipcMain.handle(
      'wppconnect:send-audio',
      async (_event, callId: string, base64Audio: string) => {
        try {
          await this.callManager.sendAudio(callId, base64Audio);
          return { success: true };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }
    );

    // Get audio capture
    ipcMain.handle(
      'wppconnect:get-capture',
      async (_event, callId: string) => {
        try {
          const chunk = await this.callManager.getCapture(callId);
          return { success: true, chunk };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }
    );

    // End all calls
    ipcMain.handle('wppconnect:end-all-calls', async () => {
      try {
        await this.callManager.endAllCalls();
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });
  }

  /**
   * Send event data to renderer process
   */
  private sendToRenderer(channel: string, data: unknown): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  /**
   * Cleanup all event listeners and IPC handlers
   */
  destroy(): void {
    // Remove all event listeners
    for (const [_eventName, cleanup] of this.eventListeners.entries()) {
      cleanup();
    }
    this.eventListeners.clear();

    // Remove all IPC handlers
    const handlers = [
      'wppconnect:get-status',
      'wppconnect:get-active-calls',
      'wppconnect:get-call-count',
      'wppconnect:get-call',
      'wppconnect:screenshot',
      'wppconnect:logout',
      'wppconnect:start-call',
      'wppconnect:end-call',
      'wppconnect:answer-call',
      'wppconnect:reject-call',
      'wppconnect:send-audio',
      'wppconnect:get-capture',
      'wppconnect:end-all-calls',
    ];

    for (const handler of handlers) {
      ipcMain.removeHandler(handler);
    }
  }
}
