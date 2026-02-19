/**
 * WppConnect Client - Manages WhatsApp session initialization and lifecycle
 */

import { EventEmitter } from 'events';
import { create, type Whatsapp } from '@wppconnect/wppconnect';
import {
  SessionStatus,
  QrCodeEvent,
  SessionStatusEvent,
  WppConnectOptions,
} from './types';

// Browser type from puppeteer (available through wppconnect)
type Browser = any;

/**
 * WppConnect client class
 * Manages the WhatsApp Web session, QR code display, and connection state
 */
export class WppConnectClient extends EventEmitter {
  private client: Whatsapp | null = null;
  private sessionName: string;
  private options: WppConnectOptions;
  private status: SessionStatus = SessionStatus.INITIALIZING;
  private browser: Browser | null = null;
  private isInitialized = false;

  constructor(options: WppConnectOptions = {}) {
    super();
    this.sessionName = options.session ?? 'default';
    this.options = {
      headless: options.headless ?? false,
      autoAnswer: options.autoAnswer ?? false,
      autoAnswerDelay: options.autoAnswerDelay ?? 1000,
      ...options,
    };
  }

  /**
   * Get current session status
   */
  getStatus(): SessionStatus {
    return this.status;
  }

  /**
   * Check if session is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.status === SessionStatus.CONNECTED;
  }

  /**
   * Get the wppconnect client instance
   */
  getClient(): Whatsapp | null {
    return this.client;
  }

  /**
   * Initialize the wppconnect session
   * This creates the client and handles QR code generation
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new Error('Client already initialized');
    }

    this.updateStatus(SessionStatus.INITIALIZING, 'Initializing session...');

    try {
      // Create wppconnect client
      this.client = await create({
        session: this.sessionName,
        headless: this.options.headless,
        browserArgs: this.options.browserArgs,
        // Event handlers
        catchQR: (base64, asciiQR, _attempts, urlCode) => {
          this.handleQRCode(base64, asciiQR, urlCode ?? '');
        },
        statusFind: (statusSession, _session) => {
          this.handleStatusChange(statusSession);
        },
        onLoadingScreen: (percent, message) => {
          this.emit('session:loading', { percent, message });
        },
        logQR: false, // We handle QR via IPC, don't log to terminal
      });

      // Get browser instance from client
      // The client has a page property, and we can get browser from page
      try {
        this.browser = (this.client as any).page?.browser() ?? null;
      } catch {
        this.browser = null;
      }

      this.isInitialized = true;
      this.updateStatus(SessionStatus.CONNECTED, 'Session connected');

      // Emit authenticated event
      this.emit('session:authenticated', { session: this.sessionName });
    } catch (error) {
      this.updateStatus(
        SessionStatus.ERROR,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  /**
   * Handle QR code generation
   */
  private handleQRCode(base64: string, asciiQR: string, urlCode: string): void {
    this.updateStatus(SessionStatus.QR_CODE, 'QR code available');

    const qrEvent: QrCodeEvent = {
      qrCode: base64,
      base64Code: urlCode,
      terminalCode: asciiQR,
    };

    this.emit('session:qr', qrEvent);
  }

  /**
   * Handle session status changes from wppconnect
   */
  private handleStatusChange(statusSession: string): void {
    let newStatus: SessionStatus;

    switch (statusSession) {
      case 'isQR':
        newStatus = SessionStatus.QR_CODE;
        break;
      case 'isChat':
      case 'inChat':
        newStatus = SessionStatus.CONNECTED;
        break;
      case 'isLogged':
      case 'inBrowser':
        newStatus = SessionStatus.CONNECTING;
        break;
      case 'desconnectedMobile':
      case 'serverClose':
        newStatus = SessionStatus.DISCONNECTED;
        break;
      default:
        // Keep current status for unknown states
        return;
    }

    if (newStatus !== this.status) {
      this.updateStatus(newStatus, `Status changed: ${statusSession}`);
    }
  }

  /**
   * Update session status and emit event
   */
  private updateStatus(status: SessionStatus, message?: string): void {
    this.status = status;

    const statusEvent: SessionStatusEvent = {
      status,
      message,
    };

    this.emit('session:status', statusEvent);
  }

  /**
   * Logout from WhatsApp
   */
  async logout(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      await this.client.logout();
      this.updateStatus(SessionStatus.DISCONNECTED, 'Logged out');
    } catch (error) {
      this.updateStatus(
        SessionStatus.ERROR,
        error instanceof Error ? error.message : 'Logout failed'
      );
      throw error;
    }
  }

  /**
   * Close the session and cleanup resources
   */
  async close(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      await this.client.close();
      this.client = null;
      this.browser = null;
      this.isInitialized = false;
      this.updateStatus(SessionStatus.DISCONNECTED, 'Session closed');
    } catch (error) {
      console.error('Error closing client:', error);
      // Still cleanup even if close fails
      this.client = null;
      this.browser = null;
      this.isInitialized = false;
      this.updateStatus(SessionStatus.DISCONNECTED, 'Session closed (with errors)');
    }
  }

  /**
   * Take a screenshot of the current session
   */
  async takeScreenshot(): Promise<string | null> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    return await this.client.takeScreenshot();
  }

  /**
   * Get browser instance (for advanced usage)
   */
  getBrowser(): Browser | null {
    return this.browser;
  }
}
