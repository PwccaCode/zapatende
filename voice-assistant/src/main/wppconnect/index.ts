/**
 * WppConnect Integration Layer
 *
 * This module provides a complete integration layer for WPPConnect WhatsApp functionality
 * in an Electron application. It handles session management, QR code display, call
 * management, and IPC bridging.
 *
 * @example
 * ```typescript
 * import { WppConnectClient, CallManager, EventBridge } from './wppconnect';
 *
 * // Create client and call manager
 * const client = new WppConnectClient({ session: 'my-session' });
 * const callManager = new CallManager({ autoAnswer: true });
 * const eventBridge = new EventBridge(client, callManager);
 *
 * // Set client in call manager
 * await client.initialize();
 * callManager.setClient(client.getClient());
 *
 * // Setup IPC bridge with main window
 * eventBridge.setMainWindow(mainWindow);
 * eventBridge.setup();
 * ```
 */

// Export types
export * from './types';

// Export client
export { WppConnectClient } from './client';

// Export call manager
export { CallManager } from './call-manager';

// Export event bridge
export { EventBridge } from './event-bridge';

// Re-export commonly used types for convenience
export type {
  ActiveCall,
  AudioChunk,
  CaptureData,
  CallEndResult,
  QrCodeEvent,
  SessionStatusEvent,
  IncomingCallEvent,
  CallEndedEvent,
  WppConnectOptions,
  StartCallOptions,
  CallAndCaptureOptions,
} from './types';

// Re-export enums
export { SessionStatus, CallStatus } from './types';
