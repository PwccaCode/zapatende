/**
 * ElevenLabs TTS Provider
 * Implements TTS using ElevenLabs API
 */

import { getSetting } from '../database/settings';
import { TTSProvider } from './provider';
import type {
  TTSSynthesizeOptions,
  TTSSynthesizeResult,
  TTSElevenLabsConfig,
} from './types';

/**
 * ElevenLabs TTS provider implementation
 */
export class ElevenLabsTTSProvider implements TTSProvider {
  private apiKey: string;
  private voiceId: string;
  private model: string;
  private baseUrl: string;

  /**
   * Create a new ElevenLabs TTS provider
   * @param config - ElevenLabs TTS configuration
   */
  constructor(config: TTSElevenLabsConfig) {
    this.apiKey = config.apiKey;
    this.voiceId = config.voiceId;
    this.model = config.model || 'eleven_multilingual_v2';
    this.baseUrl = config.baseUrl || 'https://api.elevenlabs.io';
  }

  /**
   * Create provider from database settings
   * @returns ElevenLabsTTSProvider instance or null if not configured
   */
  static fromSettings(): ElevenLabsTTSProvider | null {
    const apiKey = getSetting('tts.elevenlabs.apiKey');
    if (!apiKey) {
      return null;
    }

    const voiceId = getSetting('tts.elevenlabs.voiceId');
    if (!voiceId) {
      return null; // Voice ID is required for ElevenLabs
    }

    const model = getSetting('tts.elevenlabs.model') || undefined;
    const baseUrl = getSetting('tts.elevenlabs.baseUrl') || undefined;

    return new ElevenLabsTTSProvider({ apiKey, voiceId, model, baseUrl });
  }

  /**
   * Synthesize text to speech using ElevenLabs TTS API
   * @param text - Text to synthesize
   * @param options - Synthesis options (format, speed)
   * @returns Promise with base64 encoded audio
   */
  async synthesize(text: string, options?: TTSSynthesizeOptions): Promise<TTSSynthesizeResult> {
    const format = options?.format || 'mp3';

    try {
      // ElevenLabs API returns audio as array buffer
      const url = `${this.baseUrl}/v1/text-to-speech/${this.voiceId}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
          'Accept': format === 'mp3' ? 'audio/mpeg' :
                   format === 'opus' ? 'audio/opus' :
                   format === 'aac' ? 'audio/aac' :
                   format === 'flac' ? 'audio/flac' :
                   format === 'wav' ? 'audio/wav' : 'audio/mpeg',
        },
        body: JSON.stringify({
          text: text,
          model_id: this.model,
          output_format: format === 'mp3' ? 'mp3_44100_128' :
                        format === 'opus' ? 'opus_22050_32' :
                        format === 'aac' ? 'aac_44100_128' :
                        format === 'flac' ? 'flac_44100_128' :
                        format === 'wav' ? 'wav_44100_16' : 'mp3_44100_128',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      // Convert buffer to base64
      const buffer = Buffer.from(await response.arrayBuffer());
      const base64Audio = buffer.toString('base64');

      return {
        audio: base64Audio,
        format: format,
        duration: undefined, // ElevenLabs doesn't return duration in simple TTS
        characters: text.length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`ElevenLabs TTS synthesis failed: ${errorMessage}`);
    }
  }

  /**
   * Check if provider is configured with valid API key and voice ID
   * @returns true if API key and voice ID are present
   */
  isConfigured(): boolean {
    return this.apiKey.length > 0 && this.voiceId.length > 0;
  }

  /**
   * Get provider type identifier
   * @returns 'elevenlabs'
   */
  getProviderType(): string {
    return 'elevenlabs';
  }

  /**
   * Get current voice ID
   * @returns Voice ID
   */
  getVoice(): string {
    return this.voiceId;
  }

  /**
   * Get model ID
   * @returns Model identifier
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Get API key (for validation/testing)
   * @returns API key (masked for security)
   */
  getApiKeyMasked(): string {
    if (this.apiKey.length <= 8) {
      return '****';
    }
    return `${this.apiKey.substring(0, 4)}...${this.apiKey.substring(this.apiKey.length - 4)}`;
  }
}
