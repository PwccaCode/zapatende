/*
 * FMARK Call API TypeScript Declarations
 * Part of WPPConnect Integration
 */

declare global {
  interface Window {
    FMARK_CALL: FMARKCallModule;
    __onFmarkAudioChunk: ((chunk: AudioChunk) => void) | null;
  }
}

/**
 * Audio chunk data for streaming
 */
export interface AudioChunk {
  /** Base64 encoded audio data (without data URI prefix) */
  base64: string;
  /** Unix timestamp when chunk was captured */
  timestamp: number;
  /** Duration of this chunk in seconds */
  duration: number;
  /** Total call duration so far in seconds */
  totalDuration: number;
  /** MIME type of the audio (e.g., 'audio/webm;codecs=opus') */
  mimeType: string;
  /** Size in bytes */
  size: number;
  /** Chunk index (0, 1, 2, ...) */
  index: number;
}

/**
 * Capture state data
 */
export interface CaptureData {
  /** Full audio captured so far (base64) */
  base64: string;
  /** Total duration in seconds */
  duration: number;
  /** MIME type */
  mimeType: string;
  /** Size in bytes */
  size?: number;
  /** Whether currently recording */
  recording?: boolean;
}

/**
 * Options for callAndCapture
 */
export interface CallAndCaptureOptions {
  /** Video call mode */
  isVideo?: boolean;
  /** Max call duration in ms (0 = unlimited) */
  maxDuration?: number;
  /** Interval between audio chunks in ms (default: 1000) */
  chunkInterval?: number;
  /** Interval for full audio updates in ms (default: 3000) */
  updateInterval?: number;
  /** Auto-hangup when sent audio finishes */
  endCallOnAudioFinish?: boolean;
  /** Auto-hangup when maxDuration reached (default: true) */
  endCallOnMaxDuration?: boolean;

  // STREAMING CALLBACKS
  /** Called for each audio chunk (real-time streaming) */
  onAudioChunk?: (chunk: AudioChunk) => void;
  /** Called periodically with full audio state */
  onCaptureUpdate?: (data: CaptureData) => void;

  // EVENT CALLBACKS
  /** Called when call is answered */
  onAnswer?: (call: any, info: { success: boolean; duration: number }) => void;
  /** Called when sent audio finishes playing */
  onAudioSent?: () => void;
  /** Called when call ends */
  onEnd?: (result: CallEndResult) => void;
}

/**
 * Result when call ends
 */
export interface CallEndResult {
  /** Reason for call ending */
  reason: 'audio_finished' | 'max_duration' | 'call_ended' | 'manual_stop';
  /** Captured audio data */
  capturedAudio: {
    base64: string;
    duration: number;
    mimeType: string;
  };
}

/**
 * Handle returned by callAndCapture
 */
export interface CallHandle {
  /** Call ID */
  callId: string;
  /** Audio duration that was sent */
  duration?: number;
  /** Method used for audio injection */
  usedMethod?: string;
  /** Success status */
  success: boolean;
  /** Error message if failed */
  error?: string;

  /**
   * Get current capture state
   */
  getCapture(): CaptureData;

  /**
   * Send additional audio during the call
   * @param base64Audio Base64 encoded audio
   */
  sendAudio(
    base64Audio: string,
  ): Promise<{ success: boolean; duration?: number; error?: string }>;

  /**
   * Stop the call and get final audio
   */
  stop(): Promise<{
    capturedAudio: { base64: string; duration: number; mimeType: string };
  }>;

  /**
   * Internal stop function
   */
  stop?: () => Promise<void>;
}

/**
 * Options for startCall
 */
export interface StartCallOptions {
  /** Video call mode */
  isVideo?: boolean;
  /** Callback when call state changes */
  onStateChange?: (state: number, call: any) => void;
  /** Callback when call is answered */
  onAnswer?: (call: any) => void;
  /** Callback when call ends */
  onEnd?: (call: any) => void;
}

/**
 * Result from startCall
 */
export interface StartCallResult {
  success: boolean;
  callId?: string;
  error?: string;
}

/**
 * FMARK Call Module (browser-side)
 */
export interface FMARKCallModule {
  _version: string;
  _remoteCapture: any;
  _remoteAudioBase64: string;
  _remoteAudioChunks: AudioChunk[];
  _activeAudioSource: any;
  _gumHooked: boolean;
  _audioNodes: any;
  _chunkIndex: number;

  // Module helpers
  _ensureCallModules(): void;
  _loadVoipBackend(): Promise<any>;
  _getVoipStartCall(): any;

  // Audio capture
  startRemoteAudioCapture(options?: {
    chunkInterval?: number;
    updateInterval?: number;
    onChunk?: (chunk: AudioChunk) => void;
    onUpdate?: (data: CaptureData) => void;
    onStart?: () => void;
  }): Promise<{ success: boolean; error?: string }>;
  stopRemoteAudioCapture(): Promise<{
    success: boolean;
    base64?: string;
    duration?: number;
    mimeType?: string;
    error?: string;
  }>;
  getRemoteAudio(): CaptureData;

  // Audio injection
  _prepareAudioSource(
    base64: string,
    options?: { loop?: boolean },
  ): Promise<any>;
  _hookGetUserMedia(track: any, ctx: any, buffer: any): { restore: () => void };
  _restoreGetUserMedia(): void;
  _hookAudioConsumers(track: any, buffer: any): void;
  _restoreAudioConsumers(): void;
  _blobToBase64(blob: Blob): Promise<string>;

  // Call functions
  startCall(
    chatId: string,
    options?: StartCallOptions,
  ): Promise<StartCallResult>;
  endCall(): Promise<boolean>;
  startCallWithAudio(
    chatId: string,
    base64Audio: string,
    options?: any,
  ): Promise<CallHandle>;
  injectAudioInCall(
    base64Audio: string,
    options?: { loop?: boolean; endCallOnFinish?: boolean },
  ): Promise<{ success: boolean; duration?: number; error?: string }>;
  callAndCapture(
    chatId: string,
    base64Audio: string,
    options?: CallAndCaptureOptions,
  ): Promise<CallHandle>;
  _monitorCallState(chatId: string, opts: any): void;
}

export {};
