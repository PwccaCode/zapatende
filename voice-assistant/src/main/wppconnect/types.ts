/**
 * TypeScript types for WppConnect integration layer
 */

/**
 * Session status states
 */
export enum SessionStatus {
  INITIALIZING = 'initializing',
  QR_CODE = 'qr_code',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}

/**
 * Call status states
 */
export enum CallStatus {
  INCOMING = 'incoming',
  RINGING = 'ringing',
  ACTIVE = 'active',
  ENDED = 'ended',
  TRANSFERRED = 'transferred',
  FAILED = 'failed',
}

/**
 * Active call information
 */
export interface ActiveCall {
  /** Unique call identifier */
  callId: string;
  /** Chat ID of the call participant */
  chatId: string;
  /** Current call status */
  status: CallStatus;
  /** Timestamp when call started */
  startTime: number;
  /** Timestamp when call ended (if ended) */
  endTime?: number;
  /** Call duration in seconds */
  duration?: number;
  /** Whether this is a video call */
  isVideo: boolean;
  /** Call handle from wppconnect (for control operations) */
  handle?: any;
  /** Whether this call was auto-answered */
  autoAnswered?: boolean;
  /** Last audio chunk received */
  lastAudioChunk?: AudioChunk;
}

/**
 * Audio chunk data from call
 */
export interface AudioChunk {
  base64: string;
  timestamp: number;
  duration: number;
  totalDuration: number;
  mimeType: string;
  size: number;
  index: number;
}

/**
 * Capture state data
 */
export interface CaptureData {
  base64: string;
  duration: number;
  mimeType: string;
  size?: number;
  recording?: boolean;
}

/**
 * Call result when call ends
 */
export interface CallEndResult {
  reason: 'audio_finished' | 'max_duration' | 'call_ended' | 'manual_stop';
  capturedAudio: {
    base64: string;
    duration: number;
    mimeType: string;
  };
}

/**
 * QR code event data
 */
export interface QrCodeEvent {
  /** Base64 encoded QR code image */
  qrCode: string;
  /** Base64 code string (for backup) */
  base64Code?: string;
  /** Terminal ASCII representation */
  terminalCode?: string;
}

/**
 * Session status event data
 */
export interface SessionStatusEvent {
  status: SessionStatus;
  message?: string;
  error?: Error;
}

/**
 * Incoming call event data
 */
export interface IncomingCallEvent {
  callId: string;
  chatId: string;
  isVideo: boolean;
  timestamp: number;
}

/**
 * Call ended event data
 */
export interface CallEndedEvent {
  callId: string;
  chatId: string;
  reason: string;
  duration: number;
  timestamp: number;
}

/**
 * WppConnect client options
 */
export interface WppConnectOptions {
  /** Session name (default: 'default') */
  session?: string;
  /** Headless mode (default: false for Electron) */
  headless?: boolean;
  /** Browser args for puppeteer */
  browserArgs?: string[];
  /** User data directory */
  userDataDir?: string;
  /** Auto-answer incoming calls (default: false) */
  autoAnswer?: boolean;
  /** Auto-answer delay in ms (default: 1000) */
  autoAnswerDelay?: number;
}

/**
 * Options for starting a call
 */
export interface StartCallOptions {
  chatId: string;
  isVideo?: boolean;
  base64Audio?: string;
  maxDuration?: number;
  chunkInterval?: number;
  updateInterval?: number;
}

/**
 * Options for call and capture
 */
export interface CallAndCaptureOptions {
  chatId: string;
  base64Audio: string;
  isVideo?: boolean;
  maxDuration?: number;
  chunkInterval?: number;
  updateInterval?: number;
  endCallOnAudioFinish?: boolean;
  endCallOnMaxDuration?: boolean;
}

/**
 * Session event types
 */
export type SessionEventType =
  | 'session:qr'
  | 'session:status'
  | 'session:authenticated'
  | 'session:connection-state';

/**
 * Call event types
 */
export type CallEventType =
  | 'call:incoming'
  | 'call:answered'
  | 'call:ended'
  | 'call:audio-chunk'
  | 'call:state-change';

/**
 * All event types
 */
export type EventType = SessionEventType | CallEventType;

/**
 * Event data union
 */
export type EventData =
  | QrCodeEvent
  | SessionStatusEvent
  | IncomingCallEvent
  | CallEndedEvent
  | AudioChunk
  | { callId: string; status: CallStatus };
