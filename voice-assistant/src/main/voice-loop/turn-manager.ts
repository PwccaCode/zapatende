/**
 * Audio turn manager - accumulates audio chunks and detects turn endings
 */

import { AudioChunk } from '../audio/types';

/**
 * Configuration options for turn manager
 */
export interface TurnManagerConfig {
  /** Silence detection threshold in milliseconds (default: 1500ms) */
  silenceThresholdMs?: number;
  /** Minimum turn duration in milliseconds (default: 500ms) */
  minTurnDurationMs?: number;
  /** Maximum turn duration in milliseconds (default: 30000ms) */
  maxTurnDurationMs?: number;
  /** Whether to use simple timeout-based detection (default: true) */
  useTimeoutDetection?: boolean;
}

/**
 * Turn manager state
 */
interface TurnState {
  chunks: AudioChunk[];
  startTime: number;
  lastChunkTime: number;
  isActive: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<TurnManagerConfig> = {
  silenceThresholdMs: 1500,
  minTurnDurationMs: 500,
  maxTurnDurationMs: 30000,
  useTimeoutDetection: true,
};

/**
 * Event emitted when a turn is complete
 */
export interface TurnCompleteEvent {
  /** Combined audio buffer of all chunks in the turn */
  audioBuffer: Buffer;
  /** Number of chunks in this turn */
  chunkCount: number;
  /** Turn start timestamp */
  startTime: number;
  /** Turn end timestamp */
  endTime: number;
  /** Turn duration in milliseconds */
  duration: number;
}

/**
 * Callback type for turn completion events
 */
export type TurnCompleteCallback = (event: TurnCompleteEvent) => void | Promise<void>;

/**
 * Error class for turn manager errors
 */
export class TurnManagerError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'TurnManagerError';
  }
}

/**
 * Audio turn manager
 * 
 * Accumulates audio chunks and detects turn endings based on silence threshold.
 * Uses timeout-based detection by default.
 */
export class AudioTurnManager {
  private config: Required<TurnManagerConfig>;
  private state: TurnState;
  private completeCallback?: TurnCompleteCallback;
  private silenceTimer?: NodeJS.Timeout;
  private maxDurationTimer?: NodeJS.Timeout;
  private nextSequence: number = 0;

  constructor(config: TurnManagerConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    this.state = {
      chunks: [],
      startTime: 0,
      lastChunkTime: 0,
      isActive: false,
    };
  }

  /**
   * Set the callback for turn completion events
   */
  onTurnComplete(callback: TurnCompleteCallback): void {
    this.completeCallback = callback;
  }

  /**
   * Add an audio chunk to the current turn
   * 
   * @param chunk - Audio chunk to add
   * @returns Promise resolving to true if turn was completed by this chunk
   */
  async addChunk(chunk: AudioChunk): Promise<boolean> {
    // Add sequence number if not provided
    if (chunk.sequence === undefined) {
      chunk = { ...chunk, sequence: this.nextSequence++ };
    }

    const now = Date.now();

    // Start new turn if not active
    if (!this.state.isActive) {
      this.startNewTurn(chunk, now);
      return false;
    }

    // Check if max duration exceeded
    const turnDuration = now - this.state.startTime;
    if (turnDuration > this.config.maxTurnDurationMs) {
      await this.completeTurn(now);
      this.startNewTurn(chunk, now);
      return false;
    }

    // Check for silence (turn ended)
    const silenceDuration = now - this.state.lastChunkTime;
    if (silenceDuration > this.config.silenceThresholdMs) {
      // Complete previous turn
      await this.completeTurn(now);
      
      // Start new turn with this chunk
      this.startNewTurn(chunk, now);
      
      return true;
    }

    // Add chunk to current turn
    this.state.chunks.push(chunk);
    this.state.lastChunkTime = now;

    // Reset silence timer
    this.resetSilenceTimer();

    return false;
  }

  /**
   * Force completion of the current turn
   * 
   * @returns Promise resolving when turn is completed
   */
  async completeTurn(endTime: number = Date.now()): Promise<void> {
    if (!this.state.isActive || this.state.chunks.length === 0) {
      return;
    }

    // Clear timers
    this.clearTimers();

    // Calculate turn duration
    const duration = endTime - this.state.startTime;

    // Only complete if minimum duration met
    if (duration < this.config.minTurnDurationMs) {
      this.state.isActive = false;
      this.state.chunks = [];
      return;
    }

    // Combine chunks into single buffer
    const audioBuffer = this.combineChunks(this.state.chunks);

    // Create event
    const event: TurnCompleteEvent = {
      audioBuffer,
      chunkCount: this.state.chunks.length,
      startTime: this.state.startTime,
      endTime,
      duration,
    };

    // Reset state
    this.state.isActive = false;
    this.state.chunks = [];

    // Emit callback
    if (this.completeCallback) {
      await this.completeCallback(event);
    }
  }

  /**
   * Reset the turn manager state
   * Discards any accumulated chunks
   */
  reset(): void {
    this.clearTimers();
    this.state.isActive = false;
    this.state.chunks = [];
    this.state.startTime = 0;
    this.state.lastChunkTime = 0;
    this.nextSequence = 0;
  }

  /**
   * Get the current state
   */
  getState(): Readonly<TurnState> {
    return { ...this.state };
  }

  /**
   * Get the number of chunks in the current turn
   */
  getChunkCount(): number {
    return this.state.chunks.length;
  }

  /**
   * Check if a turn is currently active
   */
  isTurnActive(): boolean {
    return this.state.isActive;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TurnManagerConfig>): void {
    if (config.silenceThresholdMs !== undefined) {
      this.config.silenceThresholdMs = config.silenceThresholdMs;
    }
    if (config.minTurnDurationMs !== undefined) {
      this.config.minTurnDurationMs = config.minTurnDurationMs;
    }
    if (config.maxTurnDurationMs !== undefined) {
      this.config.maxTurnDurationMs = config.maxTurnDurationMs;
    }
    if (config.useTimeoutDetection !== undefined) {
      this.config.useTimeoutDetection = config.useTimeoutDetection;
    }
  }

  /**
   * Clean up resources (clear timers)
   */
  destroy(): void {
    this.clearTimers();
  }

  /**
   * Start a new turn with the given chunk
   */
  private startNewTurn(chunk: AudioChunk, now: number): void {
    this.state = {
      chunks: [chunk],
      startTime: now,
      lastChunkTime: now,
      isActive: true,
    };

    // Set timers
    this.resetSilenceTimer();
    this.setMaxDurationTimer();
  }

  /**
   * Combine audio chunks into a single buffer
   */
  private combineChunks(chunks: AudioChunk[]): Buffer {
    // Sort by sequence if available
    const sorted = [...chunks].sort((a, b) => {
      const seqA = a.sequence ?? 0;
      const seqB = b.sequence ?? 0;
      return seqA - seqB;
    });

    // Concatenate all buffers
    return Buffer.concat(sorted.map(c => c.data));
  }

  /**
   * Reset the silence detection timer
   */
  private resetSilenceTimer(): void {
    if (!this.config.useTimeoutDetection) {
      return;
    }

    this.clearSilenceTimer();

    this.silenceTimer = setTimeout(async () => {
      const now = Date.now();
      if (this.state.isActive && 
          now - this.state.lastChunkTime >= this.config.silenceThresholdMs) {
        await this.completeTurn(now);
      }
    }, this.config.silenceThresholdMs);
  }

  /**
   * Set the max duration timer
   */
  private setMaxDurationTimer(): void {
    this.clearMaxDurationTimer();

    this.maxDurationTimer = setTimeout(async () => {
      if (this.state.isActive) {
        const now = Date.now();
        await this.completeTurn(now);
      }
    }, this.config.maxTurnDurationMs);
  }

  /**
   * Clear the silence timer
   */
  private clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = undefined;
    }
  }

  /**
   * Clear the max duration timer
   */
  private clearMaxDurationTimer(): void {
    if (this.maxDurationTimer) {
      clearTimeout(this.maxDurationTimer);
      this.maxDurationTimer = undefined;
    }
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    this.clearSilenceTimer();
    this.clearMaxDurationTimer();
  }
}

/**
 * Create an audio turn manager instance
 */
export function createTurnManager(
  config?: TurnManagerConfig,
  callback?: TurnCompleteCallback
): AudioTurnManager {
  const manager = new AudioTurnManager(config);
  
  if (callback) {
    manager.onTurnComplete(callback);
  }
  
  return manager;
}
