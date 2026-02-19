/**
 * Call Manager - Manages multiple concurrent WhatsApp calls
 */

import { EventEmitter } from 'events';
import type { Whatsapp } from '@wppconnect/wppconnect';
import {
  ActiveCall,
  CallStatus,
  AudioChunk,
  CallEndResult,
  StartCallOptions,
  CallEndedEvent,
} from './types';

/**
 * Call Manager class
 * Manages active calls, handles incoming calls, and tracks call state
 */
export class CallManager extends EventEmitter {
  private activeCalls: Map<string, ActiveCall> = new Map();
  private client: Whatsapp | null = null;

  constructor(_options: { autoAnswer?: boolean; autoAnswerDelay?: number } = {}) {
    super();
  }

  /**
   * Set the wppconnect client instance
   */
  setClient(client: Whatsapp): void {
    this.client = client;
    void this.setupIncomingCallHandlers();
  }

  /**
   * Get all active calls
   */
  getActiveCalls(): ActiveCall[] {
    return Array.from(this.activeCalls.values());
  }

  /**
   * Get an active call by ID
   */
  getCall(callId: string): ActiveCall | undefined {
    return this.activeCalls.get(callId);
  }

  /**
   * Get the number of active calls
   */
  getActiveCallCount(): number {
    return this.activeCalls.size;
  }

  /**
   * Start a new call
   */
  async startCall(options: StartCallOptions): Promise<ActiveCall> {
    if (!this.client) {
      throw new Error('Client not set');
    }

    const { chatId, isVideo = false, base64Audio, ...callOptions } = options;

    // Create call record
    const callId = `outgoing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const activeCall: ActiveCall = {
      callId,
      chatId,
      status: CallStatus.RINGING,
      startTime: Date.now(),
      isVideo,
      autoAnswered: false,
    };

    this.activeCalls.set(callId, activeCall);
    this.emit('call:started', { callId, chatId, isVideo });

    try {
      let handle;

      if (base64Audio) {
        // Use callAndCapture for calls with audio
        handle = await this.client.callAndCapture(chatId, base64Audio, {
          isVideo,
          maxDuration: callOptions.maxDuration,
          chunkInterval: callOptions.chunkInterval,
          updateInterval: callOptions.updateInterval,
          onAudioChunk: (chunk: AudioChunk) => this.handleAudioChunk(callId, chunk),
          onAnswer: (_call: unknown, info: { success: boolean; duration: number }) =>
            this.handleCallAnswered(callId, info),
          onEnd: (result: CallEndResult) => this.handleCallEnded(callId, result),
        });
      } else {
        // Use startCall for simple calls
        const result = await this.client.startCall(chatId, {
          isVideo,
          onAnswer: (_call: unknown) =>
            this.handleCallAnswered(callId, { success: true, duration: 0 }),
          onEnd: (_call: unknown) =>
            this.handleCallEnded(callId, {
              reason: 'call_ended',
              capturedAudio: { base64: '', duration: 0, mimeType: 'audio/webm' },
            }),
          onStateChange: (state: number) => this.handleCallStateChange(callId, state),
        });

        if (!result.success) {
          throw new Error(result.error || 'Failed to start call');
        }
      }

      // Update call with handle
      activeCall.handle = handle;
      this.emit('call:state-change', { callId, status: CallStatus.RINGING });

      return activeCall;
    } catch (error) {
      // Clean up failed call
      this.activeCalls.delete(callId);
      activeCall.status = CallStatus.FAILED;
      activeCall.endTime = Date.now();
      this.emit('call:ended', {
        callId,
        chatId,
        reason: error instanceof Error ? error.message : 'Unknown error',
        duration: 0,
        timestamp: Date.now(),
      });
      throw error;
    }
  }

  /**
   * End an active call
   */
  async endCall(callId: string): Promise<void> {
    const activeCall = this.activeCalls.get(callId);
    if (!activeCall) {
      throw new Error(`Call ${callId} not found`);
    }

    if (activeCall.handle && typeof activeCall.handle.stop === 'function') {
      try {
        await activeCall.handle.stop();
      } catch (error) {
        console.error('Error stopping call:', error);
      }
    } else if (this.client) {
      try {
        await this.client.endCall();
      } catch (error) {
        console.error('Error ending call via client:', error);
      }
    }

    // Update call state
    activeCall.status = CallStatus.ENDED;
    activeCall.endTime = Date.now();
    activeCall.duration = Math.floor((activeCall.endTime - activeCall.startTime) / 1000);

    // Remove from active calls after a delay
    setTimeout(() => {
      this.activeCalls.delete(callId);
    }, 5000);

    this.emit('call:ended', {
      callId,
      chatId: activeCall.chatId,
      reason: 'manual_stop',
      duration: activeCall.duration,
      timestamp: Date.now(),
    });
  }

  /**
   * Send additional audio to an active call
   */
  async sendAudio(callId: string, base64Audio: string): Promise<void> {
    const activeCall = this.activeCalls.get(callId);
    if (!activeCall) {
      throw new Error(`Call ${callId} not found`);
    }

    if (!activeCall.handle || typeof activeCall.handle.sendAudio !== 'function') {
      throw new Error('Call does not support audio injection');
    }

    const result = await activeCall.handle.sendAudio(base64Audio);
    if (!result.success) {
      throw new Error(result.error || 'Failed to send audio');
    }
  }

  /**
   * Get audio capture from an active call
   */
  async getCapture(callId: string): Promise<AudioChunk | null> {
    const activeCall = this.activeCalls.get(callId);
    if (!activeCall) {
      throw new Error(`Call ${callId} not found`);
    }

    if (!activeCall.handle || typeof activeCall.handle.getCapture !== 'function') {
      return activeCall.lastAudioChunk || null;
    }

    try {
      const capture = await activeCall.handle.getCapture();
      const chunk: AudioChunk = {
        base64: capture.base64,
        timestamp: Date.now(),
        duration: capture.duration,
        totalDuration: capture.duration,
        mimeType: capture.mimeType,
        size: capture.size || capture.base64.length,
        index: 0,
      };
      activeCall.lastAudioChunk = chunk;
      return chunk;
    } catch (error) {
      console.error('Error getting capture:', error);
      return activeCall.lastAudioChunk || null;
    }
  }

  /**
   * End all active calls
   */
  async endAllCalls(): Promise<void> {
    const callIds = Array.from(this.activeCalls.keys());
    await Promise.allSettled(callIds.map((id) => this.endCall(id)));
  }

  /**
   * Setup handlers for incoming calls
   * Note: This is a placeholder implementation
   * Actual event names may differ based on wppconnect version
   */
  private async setupIncomingCallHandlers(): Promise<void> {
    if (!this.client) {
      return;
    }

    // Listen for incoming calls via wppconnect events
    // Note: This is a placeholder - actual event names may differ based on wppconnect version
    // You may need to adjust this based on actual wppconnect events

    // Example of how to listen for incoming calls (adjust as needed):
    // this.client.on('call', (call) => this._handleIncomingCall(call));
  }

  /**
   * Answer an incoming call
   */
  async answerCall(callId: string): Promise<void> {
    const activeCall = this.activeCalls.get(callId);
    if (!activeCall) {
      throw new Error(`Call ${callId} not found`);
    }

    if (activeCall.status !== CallStatus.INCOMING) {
      throw new Error(`Call ${callId} is not in incoming state`);
    }

    // Update status to active
    activeCall.status = CallStatus.ACTIVE;
    activeCall.autoAnswered = true;

    this.emit('call:answered', { callId, chatId: activeCall.chatId });
  }

  /**
   * Reject an incoming call
   */
  async rejectCall(callId: string): Promise<void> {
    const activeCall = this.activeCalls.get(callId);
    if (!activeCall) {
      throw new Error(`Call ${callId} not found`);
    }

    // End the call
    await this.endCall(callId);
  }

  /**
   * Handle call answered event
   */
  private handleCallAnswered(callId: string, info: { success: boolean; duration: number }): void {
    const activeCall = this.activeCalls.get(callId);
    if (!activeCall) {
      return;
    }

    if (info.success) {
      activeCall.status = CallStatus.ACTIVE;
      this.emit('call:answered', { callId, chatId: activeCall.chatId });
    }
  }

  /**
   * Handle call ended event
   */
  private handleCallEnded(callId: string, result: CallEndResult): void {
    const activeCall = this.activeCalls.get(callId);
    if (!activeCall) {
      return;
    }

    activeCall.status = CallStatus.ENDED;
    activeCall.endTime = Date.now();
    activeCall.duration = Math.floor((activeCall.endTime - activeCall.startTime) / 1000);

    const endedEvent: CallEndedEvent = {
      callId,
      chatId: activeCall.chatId,
      reason: result.reason,
      duration: activeCall.duration,
      timestamp: Date.now(),
    };

    this.emit('call:ended', endedEvent);

    // Remove from active calls after a delay
    setTimeout(() => {
      this.activeCalls.delete(callId);
    }, 5000);
  }

  /**
   * Handle audio chunk event
   */
  private handleAudioChunk(callId: string, chunk: AudioChunk): void {
    const activeCall = this.activeCalls.get(callId);
    if (!activeCall) {
      return;
    }

    activeCall.lastAudioChunk = chunk;
    this.emit('call:audio-chunk', { callId, chunk });
  }

  /**
   * Handle call state change event
   */
  private handleCallStateChange(callId: string, state: number): void {
    const activeCall = this.activeCalls.get(callId);
    if (!activeCall) {
      return;
    }

    let newStatus: CallStatus;
    switch (state) {
      case 1: // RINGING
        newStatus = CallStatus.RINGING;
        break;
      case 2: // CONNECTED
        newStatus = CallStatus.ACTIVE;
        break;
      case 3: // ENDED
        newStatus = CallStatus.ENDED;
        break;
      default:
        return;
    }

    if (newStatus !== activeCall.status) {
      activeCall.status = newStatus;
      this.emit('call:state-change', { callId, status: newStatus });
    }
  }
}
