/**
 * Voice Loop Engine - Main orchestration engine for voice assistant
 * Handles the complete flow: Audio → STT → AI → TTS → Audio output
 * With human takeover modes and state management
 */

import { AudioTurnManager, TurnCompleteEvent } from './turn-manager';
import { AudioChunk } from '../audio/types';
import {
  VoiceLoopState,
  HumanTakeoverTrigger,
  VoiceLoopConfig,
  VoiceLoopEventType,
  VoiceLoopEvent,
  VoiceLoopCallback,
  VoiceLoopStats,
  HumanTakeoverState,
} from './types';

/**
 * Error class for voice loop errors
 */
export class VoiceLoopError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'VoiceLoopError';
  }
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<VoiceLoopConfig> = {
  silenceThresholdMs: 1500,
  minTurnDurationMs: 500,
  maxTurnDurationMs: 30000,
  transferKeywords: [
    'falar com humano',
    'atendente',
    'humano',
    'transferir',
    'operador',
    'quero falar com alguém',
  ],
  maxTurns: 10,
  autoPauseOnTakeover: true,
  enableConfidenceTakeover: true,
  minConfidenceThreshold: 0.5,
};

/**
 * Voice Loop Engine
 * 
 * Orchestrates the complete voice assistant pipeline:
 * 1. Receives audio chunks
 * 2. Detects turn endings via TurnManager
 * 3. Transcribes audio via STT
 * 4. Generates AI response
 * 5. Converts to speech via TTS
 * 6. Sends audio to caller
 * 7. Monitors for human takeover triggers
 */
export class VoiceLoopEngine {
  private config: Required<VoiceLoopConfig>;
  private state: VoiceLoopState = VoiceLoopState.IDLE;
  private turnManager: AudioTurnManager;
  private takeoverState: HumanTakeoverState = {
    isActive: false,
    triggerCount: 0,
  };
  
  // Conversation state
  private currentTurnNumber: number = 0;
  private consecutiveFailures: number = 0;
  
  // Stats
  private stats: VoiceLoopStats = {
    totalTurns: 0,
    successfulTranscriptions: 0,
    failedTranscriptions: 0,
    averageConfidence: 0,
    totalDuration: 0,
  };
  
  // Callbacks
  private callbacks: Map<VoiceLoopEventType, Set<VoiceLoopCallback>> = new Map();

  constructor(config: VoiceLoopConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
    
    this.turnManager = new AudioTurnManager({
      silenceThresholdMs: this.config.silenceThresholdMs,
      minTurnDurationMs: this.config.minTurnDurationMs,
      maxTurnDurationMs: this.config.maxTurnDurationMs,
    });
    
    this.turnManager.onTurnComplete(this.handleTurnComplete.bind(this));
  }

  /**
   * Register callback for voice loop events
   */
  on(event: VoiceLoopEventType, callback: VoiceLoopCallback): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, new Set());
    }
    this.callbacks.get(event)!.add(callback);
  }

  /**
   * Unregister callback
   */
  off(event: VoiceLoopEventType, callback: VoiceLoopCallback): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * Add an audio chunk to the voice loop
   */
  async addAudioChunk(chunk: AudioChunk): Promise<void> {
    if (this.takeoverState.isActive) {
      // Ignore audio during takeover
      return;
    }
    
    if (this.state === VoiceLoopState.ERROR || this.state === VoiceLoopState.PAUSED) {
      return;
    }
    
    // Transition to listening state if idle
    if (this.state === VoiceLoopState.IDLE) {
      await this.setState(VoiceLoopState.LISTENING);
    }
    
    // Add chunk to turn manager
    await this.turnManager.addChunk(chunk);
  }

  /**
   * Start the voice loop
   */
  start(): void {
    if (this.state === VoiceLoopState.PAUSED || this.state === VoiceLoopState.ERROR) {
      this.reset();
    }
    
    this.stats.conversationStartTime = Date.now();
    this.currentTurnNumber = 0;
    
    // Started event would be emitted here via callbacks if needed
  }

  /**
   * Pause the voice loop
   */
  pause(): void {
    if (this.state === VoiceLoopState.LISTENING || this.state === VoiceLoopState.PROCESSING) {
      this.setState(VoiceLoopState.PAUSED);
    }
  }

  /**
   * Resume the voice loop
   */
  resume(): void {
    if (this.state === VoiceLoopState.PAUSED) {
      this.setState(VoiceLoopState.LISTENING);
    }
  }

  /**
   * Reset the voice loop
   */
  reset(): void {
    this.turnManager.reset();
    this.currentTurnNumber = 0;
    this.consecutiveFailures = 0;
    this.takeoverState = {
      isActive: false,
      triggerCount: 0,
    };
    this.setState(VoiceLoopState.IDLE);
  }

  /**
   * Trigger human takeover
   */
  triggerHumanTakeover(trigger: HumanTakeoverTrigger, reason: string): void {
    if (this.takeoverState.isActive) {
      return;
    }
    
    this.takeoverState = {
      isActive: true,
      trigger,
      reason,
      triggeredAt: Date.now(),
      triggerCount: this.takeoverState.triggerCount + 1,
    };
    
    if (this.config.autoPauseOnTakeover) {
      this.pause();
    }
    
    this.emitEvent({
      type: VoiceLoopEventType.HUMAN_TAKEOVER_TRIGGERED,
      data: { trigger, reason },
      timestamp: Date.now(),
    });
  }

  /**
   * Cancel human takeover and resume AI
   */
  cancelHumanTakeover(reason: string): void {
    if (!this.takeoverState.isActive) {
      return;
    }
    
    this.takeoverState.isActive = false;
    this.resume();
    
    this.emitEvent({
      type: VoiceLoopEventType.HUMAN_TAKEOVER_CANCELLED,
      data: { reason },
      timestamp: Date.now(),
    });
  }

  /**
   * Get current state
   */
  getState(): VoiceLoopState {
    return this.state;
  }

  /**
   * Get human takeover state
   */
  getTakeoverState(): HumanTakeoverState {
    return { ...this.takeoverState };
  }

  /**
   * Get statistics
   */
  getStats(): VoiceLoopStats {
    const now = Date.now();
    const totalDuration = this.stats.conversationStartTime
      ? now - this.stats.conversationStartTime
      : 0;
    
    return {
      ...this.stats,
      totalDuration,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VoiceLoopConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
    
    // Update turn manager config
    this.turnManager.updateConfig({
      silenceThresholdMs: this.config.silenceThresholdMs,
      minTurnDurationMs: this.config.minTurnDurationMs,
      maxTurnDurationMs: this.config.maxTurnDurationMs,
    });
  }

  /**
   * Handle turn completion from turn manager
   */
  private async handleTurnComplete(event: TurnCompleteEvent): Promise<void> {
    await this.setState(VoiceLoopState.PROCESSING);
    
    try {
      // Placeholder implementation - STT, AI, TTS will be integrated when providers are available
      console.log('Turn complete, processing audio buffer:', event.audioBuffer.length, 'bytes');
      
      // TODO: Integrate actual STT provider
      // const transcription = await this.transcribeAudio(event.audioBuffer);
      
      // TODO: Integrate actual AI provider
      // const response = await this.generateAIResponse(transcription.text);
      
      // TODO: Integrate actual TTS provider
      // const tts = await this.generateSpeech(response);
      
      // Emit mock events for now
      this.emitEvent({
        type: VoiceLoopEventType.TURN_COMPLETED,
        data: {
          turnNumber: this.currentTurnNumber + 1,
          transcription: 'Mock transcription',
          response: 'Mock response',
        },
        timestamp: Date.now(),
      });
      
      // Complete turn
      this.currentTurnNumber++;
      this.consecutiveFailures = 0;
      
      // Return to listening state
      await this.setState(VoiceLoopState.LISTENING);
      
    } catch (error) {
      this.consecutiveFailures++;
      
      // Check for failure-based takeover
      if (this.consecutiveFailures >= 3) {
        this.triggerHumanTakeover(
          HumanTakeoverTrigger.FAILED_ATTEMPTS,
          `${this.consecutiveFailures} consecutive failures`
        );
        return;
      }
      
      // Emit error event
      this.emitEvent({
        type: VoiceLoopEventType.ERROR,
        data: {
          error: error as Error,
          phase: this.state,
        },
        timestamp: Date.now(),
      });
      
      await this.setState(VoiceLoopState.ERROR);
    }
  }

  /**
   * Set state and emit event
   */
  private async setState(newState: VoiceLoopState): Promise<void> {
    const previousState = this.state;
    this.state = newState;
    
    this.emitEvent({
      type: VoiceLoopEventType.STATE_CHANGED,
      data: { previousState, newState },
      timestamp: Date.now(),
    });
  }

  /**
   * Emit event to all registered callbacks
   */
  private emitEvent(event: VoiceLoopEvent): void {
    const callbacks = this.callbacks.get(event.type);
    if (callbacks) {
      callbacks.forEach(callback => callback(event));
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.turnManager.destroy();
    this.callbacks.clear();
  }
}

/**
 * Create a voice loop engine instance
 */
export function createVoiceLoopEngine(
  config?: VoiceLoopConfig
): VoiceLoopEngine {
  return new VoiceLoopEngine(config);
}
