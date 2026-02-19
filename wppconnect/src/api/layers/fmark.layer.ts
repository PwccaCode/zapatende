/*
 * This file is part of WPPConnect.
 *
 * WPPConnect is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * WPPConnect is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with WPPConnect.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Page } from 'puppeteer';
import { BusinessLayer } from './business.layer';
import { CreateConfig } from '../../config/create-config';
import { evaluateAndReturn } from '../helpers';

/**
 * Audio chunk data for streaming
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
 * Options for callAndCapture
 */
export interface CallAndCaptureOptions {
  isVideo?: boolean;
  maxDuration?: number;
  chunkInterval?: number;
  updateInterval?: number;
  endCallOnAudioFinish?: boolean;
  endCallOnMaxDuration?: boolean;
  onAudioChunk?: (chunk: AudioChunk) => void;
  onCaptureUpdate?: (data: CaptureData) => void;
  onAnswer?: (call: any, info: { success: boolean; duration: number }) => void;
  onAudioSent?: () => void;
  onEnd?: (result: CallEndResult) => void;
}

/**
 * Result when call ends
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
 * Handle returned by callAndCapture
 */
export interface CallHandle {
  callId: string;
  duration?: number;
  usedMethod?: string;
  success: boolean;
  error?: string;
  getCapture(): Promise<CaptureData>;
  sendAudio(
    base64Audio: string,
  ): Promise<{ success: boolean; duration?: number; error?: string }>;
  stop(): Promise<{
    capturedAudio: { base64: string; duration: number; mimeType: string };
  }>;
}

/**
 * Options for startCall
 */
export interface StartCallOptions {
  isVideo?: boolean;
  onStateChange?: (state: number, call: any) => void;
  onAnswer?: (call: any) => void;
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
 * FMARK Call Layer - Provides voice/video call functionality with audio streaming
 *
 * @example
 * ```typescript
 * const client = await wppconnect.create({ session: 'test' });
 *
 * // Make a call with audio streaming
 * const call = await client.callAndCapture('5511999999999@c.us', audioBase64, {
 *   maxDuration: 60000,
 *   chunkInterval: 1000,
 *   onAudioChunk: (chunk) => {
 *     console.log(`Chunk ${chunk.index}: ${chunk.duration}s, ${chunk.size} bytes`);
 *     // Process chunk: STT, save to file, stream to WebSocket...
 *   },
 *   onEnd: (result) => {
 *     console.log('Call ended. Duration:', result.capturedAudio.duration);
 *   }
 * });
 *
 * // Send additional audio during call
 * await call.sendAudio(secondAudioBase64);
 *
 * // Stop call manually
 * const final = await call.stop();
 * ```
 */
export class FmarkLayer extends BusinessLayer {
  private _audioChunkCallbacks: Map<string, (chunk: AudioChunk) => void> =
    new Map();

  constructor(
    public page: Page,
    session?: string,
    options?: CreateConfig,
  ) {
    super(page, session, options);
  }

  /**
   * @category Call
   *
   * Make a voice/video call with audio injection and capture streaming.
   *
   * This is the main call function that:
   * 1. Calls the target
   * 2. Injects your audio (base64) into the call
   * 3. Captures the audio from the other person
   * 4. Streams audio chunks in real-time via onAudioChunk callback
   *
   * @param chatId Target chat ID (e.g., '5511999999999@c.us')
   * @param base64Audio Audio to play when call is answered (base64, any format)
   * @param options Call options including streaming callbacks
   * @returns CallHandle with methods to control the call
   *
   * @example
   * ```typescript
   * const call = await client.callAndCapture('5511999999999@c.us', audioBase64, {
   *   maxDuration: 60000,
   *   onAudioChunk: (chunk) => console.log('Chunk:', chunk.index),
   * });
   *
   * // Get current capture
   * const capture = await call.getCapture();
   *
   * // Send more audio
   * await call.sendAudio(moreAudioBase64);
   *
   * // End call
   * const result = await call.stop();
   * ```
   */
  public async callAndCapture(
    chatId: string,
    base64Audio: string,
    options: CallAndCaptureOptions = {},
  ): Promise<CallHandle> {
    // Generate unique ID for this call to track callbacks
    const callTrackerId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Set up streaming callback bridge if onAudioChunk is provided
    if (options.onAudioChunk) {
      this._audioChunkCallbacks.set(callTrackerId, options.onAudioChunk);

      // Expose function to receive chunks from browser
      await this.page.exposeFunction(
        `__fmarkChunk_${callTrackerId}`,
        (chunk: AudioChunk) => {
          const callback = this._audioChunkCallbacks.get(callTrackerId);
          if (callback) {
            try {
              callback(chunk);
            } catch (e) {
              this.log('warn', 'Audio chunk callback error', { error: e });
            }
          }
        },
      );
    }

    const result = await evaluateAndReturn(
      this.page,
      async ({ chatId, base64Audio, options, callTrackerId }) => {
        // Set up chunk callback bridge
        if (options.onAudioChunk && callTrackerId) {
          const callbackName = `__fmarkChunk_${callTrackerId}`;
          options.onAudioChunk = (chunk) => {
            if (typeof window[callbackName] === 'function') {
              window[callbackName](chunk);
            }
          };
        }

        const callResult = await window.FMARK_CALL.callAndCapture(
          chatId,
          base64Audio,
          options,
        );
        return callResult;
      },
      {
        chatId,
        base64Audio,
        options: this._serializeOptions(options),
        callTrackerId,
      },
    );

    // Create handle with Node.js-side methods
    const handle: CallHandle = {
      callId: result.callId,
      duration: result.duration,
      usedMethod: result.usedMethod,
      success: result.success,
      error: result.error,

      getCapture: async () => {
        return await evaluateAndReturn(this.page, () => {
          return window.FMARK_CALL.getRemoteAudio();
        });
      },

      sendAudio: async (newBase64Audio: string) => {
        return await evaluateAndReturn(
          this.page,
          async ({ base64 }) => {
            return await window.FMARK_CALL.injectAudioInCall(base64);
          },
          { base64: newBase64Audio },
        );
      },

      stop: async () => {
        const stopResult = await evaluateAndReturn(this.page, async () => {
          // Stop capture
          const captureResult =
            await window.FMARK_CALL.stopRemoteAudioCapture();
          // End call
          await window.FMARK_CALL.endCall();
          return captureResult;
        });

        // Clean up callback
        this._audioChunkCallbacks.delete(callTrackerId);

        return {
          capturedAudio: {
            base64: stopResult.base64 || '',
            duration: stopResult.duration || 0,
            mimeType: stopResult.mimeType || 'audio/webm',
          },
        };
      },
    };

    // If call failed, clean up and return
    if (!result.success) {
      this._audioChunkCallbacks.delete(callTrackerId);
      return handle;
    }

    // Set up end callback handler
    if (options.onEnd) {
      await this.page.exposeFunction(
        `__fmarkEnd_${callTrackerId}`,
        (endResult: CallEndResult) => {
          this._audioChunkCallbacks.delete(callTrackerId);
          options.onEnd!(endResult);
        },
      );

      // Update the browser-side callback
      await evaluateAndReturn(
        this.page,
        ({ callTrackerId }) => {
          // The onEnd will be called by FMARK_CALL internals
        },
        { callTrackerId },
      );
    }

    return handle;
  }

  /**
   * @category Call
   *
   * Start a voice or video call (without audio injection).
   *
   * @param chatId Target chat ID
   * @param options Call options
   * @returns Call result with callId
   */
  public async startCall(
    chatId: string,
    options: StartCallOptions = {},
  ): Promise<StartCallResult> {
    return await evaluateAndReturn(
      this.page,
      async ({ chatId, options }) => {
        return await window.FMARK_CALL.startCall(chatId, options);
      },
      { chatId, options: this._serializeCallOptions(options) },
    );
  }

  /**
   * @category Call
   *
   * End the active call.
   */
  public async endCall(): Promise<boolean> {
    return await evaluateAndReturn(this.page, async () => {
      return await window.FMARK_CALL.endCall();
    });
  }

  /**
   * @category Call
   *
   * Inject audio into an active call.
   * Requires a call to be active (started via startCall or callAndCapture).
   *
   * @param base64Audio Audio to inject (base64 encoded)
   * @param options Options for audio injection
   */
  public async injectAudioInCall(
    base64Audio: string,
    options: { loop?: boolean } = {},
  ): Promise<{ success: boolean; duration?: number; error?: string }> {
    return await evaluateAndReturn(
      this.page,
      async ({ base64Audio, options }) => {
        return await window.FMARK_CALL.injectAudioInCall(base64Audio, options);
      },
      { base64Audio, options },
    );
  }

  /**
   * @category Call
   *
   * Start capturing audio from the current tab.
   * This is used internally by callAndCapture but can be called separately.
   *
   * @param options Capture options
   * @returns Success status
   */
  public async startRemoteAudioCapture(
    options: {
      chunkInterval?: number;
      updateInterval?: number;
      onChunk?: (chunk: AudioChunk) => void;
    } = {},
  ): Promise<{ success: boolean; error?: string }> {
    const captureId = `capture_${Date.now()}`;

    if (options.onChunk) {
      await this.page.exposeFunction(
        `__fmarkCaptureChunk_${captureId}`,
        (chunk: AudioChunk) => {
          options.onChunk!(chunk);
        },
      );

      return await evaluateAndReturn(
        this.page,
        async ({ captureId, options }) => {
          return await window.FMARK_CALL.startRemoteAudioCapture({
            ...options,
            onChunk: (chunk) => {
              const callbackName = `__fmarkCaptureChunk_${captureId}`;
              if (typeof window[callbackName] === 'function') {
                window[callbackName](chunk);
              }
            },
          });
        },
        {
          captureId,
          options: {
            chunkInterval: options.chunkInterval,
            updateInterval: options.updateInterval,
          },
        },
      );
    }

    return await evaluateAndReturn(
      this.page,
      async ({ options }) => {
        return await window.FMARK_CALL.startRemoteAudioCapture(options);
      },
      {
        options: {
          chunkInterval: options.chunkInterval,
          updateInterval: options.updateInterval,
        },
      },
    );
  }

  /**
   * @category Call
   *
   * Stop capturing audio and return the final result.
   */
  public async stopRemoteAudioCapture(): Promise<{
    success: boolean;
    base64?: string;
    duration?: number;
    mimeType?: string;
    error?: string;
  }> {
    return await evaluateAndReturn(this.page, async () => {
      return await window.FMARK_CALL.stopRemoteAudioCapture();
    });
  }

  /**
   * @category Call
   *
   * Get current audio capture state without stopping.
   */
  public async getRemoteAudio(): Promise<CaptureData> {
    return await evaluateAndReturn(this.page, () => {
      return window.FMARK_CALL.getRemoteAudio();
    });
  }

  /**
   * Serialize options for browser context
   */
  private _serializeOptions(options: CallAndCaptureOptions): any {
    const serialized: any = { ...options };
    // Remove callbacks from serialized options (they'll be handled via exposeFunction)
    delete serialized.onAudioChunk;
    delete serialized.onCaptureUpdate;
    delete serialized.onAnswer;
    delete serialized.onAudioSent;
    delete serialized.onEnd;
    return serialized;
  }

  private _serializeCallOptions(options: StartCallOptions): any {
    const serialized: any = { ...options };
    delete serialized.onStateChange;
    delete serialized.onAnswer;
    delete serialized.onEnd;
    return serialized;
  }
}
