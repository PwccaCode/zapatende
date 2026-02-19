/**
 * Voice Loop Types - Main orchestration types for voice assistant
 */

/**
 * Voice loop state machine states
 */
export enum VoiceLoopState {
  IDLE = 'idle',
  LISTENING = 'listening',
  PROCESSING = 'processing',
  SPEAKING = 'speaking',
  PAUSED = 'paused',
  TRANSFERRING = 'transferring',
  ERROR = 'error',
}

/**
 * Human takeover trigger reasons
 */
export enum HumanTakeoverTrigger {
  /** Manual trigger from UI */
  MANUAL = 'manual',
  /** User said transfer keywords */
  KEYWORD = 'keyword',
  /** AI detected need for human */
  AI_DETECTED = 'ai_detected',
  /** Multiple failed attempts */
  FAILED_ATTEMPTS = 'failed_attempts',
  /** User requested */
  USER_REQUEST = 'user_request',
}

/**
 * Voice loop configuration
 */
export interface VoiceLoopConfig {
  /** Turn manager silence threshold (ms) */
  silenceThresholdMs?: number;
  /** Minimum turn duration (ms) */
  minTurnDurationMs?: number;
  /** Maximum turn duration (ms) */
  maxTurnDurationMs?: number;
  /** Transfer keywords (phrases that trigger human takeover) */
  transferKeywords?: string[];
  /** Maximum conversation turns before offering transfer */
  maxTurns?: number;
  /** Enable auto-pause on human takeover */
  autoPauseOnTakeover?: boolean;
  /** Enable confidence-based takeover (if transcription confidence is low) */
  enableConfidenceTakeover?: boolean;
  /** Minimum confidence threshold (0-1) */
  minConfidenceThreshold?: number;
}

/**
 * Voice loop event types
 */
export enum VoiceLoopEventType {
  STATE_CHANGED = 'state_changed',
  TRANSCRIPTION_READY = 'transcription_ready',
  AI_RESPONSE_READY = 'ai_response_ready',
  TTS_READY = 'tts_ready',
  AUDIO_PLAYED = 'audio_played',
  HUMAN_TAKEOVER_TRIGGERED = 'human_takeover_triggered',
  HUMAN_TAKEOVER_CANCELLED = 'human_takeover_cancelled',
  ERROR = 'error',
  TURN_COMPLETED = 'turn_completed',
}

/**
 * Voice loop event data
 */
export interface VoiceLoopEventData {
  [VoiceLoopEventType.STATE_CHANGED]: {
    previousState: VoiceLoopState;
    newState: VoiceLoopState;
  };
  [VoiceLoopEventType.TRANSCRIPTION_READY]: {
    text: string;
    confidence?: number;
    language?: string;
  };
  [VoiceLoopEventType.AI_RESPONSE_READY]: {
    text: string;
    model: string;
  };
  [VoiceLoopEventType.TTS_READY]: {
    audio: string;
    format: string;
    duration?: number;
  };
  [VoiceLoopEventType.AUDIO_PLAYED]: {
    duration: number;
  };
  [VoiceLoopEventType.HUMAN_TAKEOVER_TRIGGERED]: {
    trigger: HumanTakeoverTrigger;
    reason: string;
  };
  [VoiceLoopEventType.HUMAN_TAKEOVER_CANCELLED]: {
    reason: string;
  };
  [VoiceLoopEventType.ERROR]: {
    error: Error;
    phase: VoiceLoopState;
  };
  [VoiceLoopEventType.TURN_COMPLETED]: {
    turnNumber: number;
    transcription: string;
    response: string;
  };
}

/**
 * Voice loop event
 */
export interface VoiceLoopEvent<T extends VoiceLoopEventType = VoiceLoopEventType> {
  type: T;
  data: VoiceLoopEventData[T];
  timestamp: number;
}

/**
 * Voice loop callback
 */
export type VoiceLoopCallback = (event: VoiceLoopEvent) => void | Promise<void>;

/**
 * Voice loop statistics
 */
export interface VoiceLoopStats {
  /** Total turns in current conversation */
  totalTurns: number;
  /** Successful transcriptions */
  successfulTranscriptions: number;
  /** Failed transcriptions */
  failedTranscriptions: number;
  /** Average transcription confidence */
  averageConfidence: number;
  /** Total conversation duration (ms) */
  totalDuration: number;
  /** Current conversation start time */
  conversationStartTime?: number;
}

/**
 * Human takeover state
 */
export interface HumanTakeoverState {
  /** Whether takeover is currently active */
  isActive: boolean;
  /** What triggered the takeover */
  trigger?: HumanTakeoverTrigger;
  /** Human-readable reason */
  reason?: string;
  /** Timestamp when takeover was triggered */
  triggeredAt?: number;
  /** Number of times takeover has been triggered in this session */
  triggerCount: number;
}
