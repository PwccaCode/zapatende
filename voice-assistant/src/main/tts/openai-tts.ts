/**
 * OpenAI TTS Provider
 * Implements TTS using OpenAI's Text-to-Speech API
 */

import OpenAI from 'openai';
import { getSetting } from '../database/settings';
import { TTSProvider } from './provider';
import type {
  TTSSynthesizeOptions,
  TTSSynthesizeResult,
  TTSOpenAIConfig,
  TTSOpenAIVoice,
} from './types';

/**
 * OpenAI TTS provider implementation
 */
export class OpenAITTSProvider implements TTSProvider {
  private client: OpenAI;
  private voice: TTSOpenAIVoice;
  private apiKey: string;

  /**
   * Create a new OpenAI TTS provider
   * @param config - OpenAI TTS configuration
   */
  constructor(config: TTSOpenAIConfig) {
    this.apiKey = config.apiKey;
    this.voice = config.voice || 'alloy';

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  /**
   * Create provider from database settings
   * @returns OpenAITTSProvider instance or null if not configured
   */
  static fromSettings(): OpenAITTSProvider | null {
    const apiKey = getSetting('tts.openai.apiKey') || getSetting('ai.openai.apiKey');
    if (!apiKey) {
      return null;
    }

    const voice = (getSetting('tts.openai.voice') || undefined) as TTSOpenAIVoice | undefined;
    const baseUrl = getSetting('tts.openai.baseUrl') || getSetting('ai.openai.baseUrl') || undefined;

    return new OpenAITTSProvider({ apiKey, voice, baseUrl });
  }

  /**
   * Synthesize text to speech using OpenAI TTS API
   * @param text - Text to synthesize
   * @param options - Synthesis options (format, speed)
   * @returns Promise with base64 encoded audio
   */
  async synthesize(text: string, options?: TTSSynthesizeOptions): Promise<TTSSynthesizeResult> {
    const format = options?.format || 'mp3';
    const speed = options?.speed || 1.0;

    try {
      // OpenAI TTS API returns audio buffer
      const response = await this.client.audio.speech.create({
        model: 'tts-1',
        voice: this.voice,
        input: text,
        response_format: format === 'mp3' ? 'mp3' : format === 'opus' ? 'opus' : 'aac',
        speed: speed,
      });

      // Convert buffer to base64
      const buffer = Buffer.from(await response.arrayBuffer());
      const base64Audio = buffer.toString('base64');

      return {
        audio: base64Audio,
        format: format,
        duration: undefined, // OpenAI doesn't return duration
        characters: text.length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`OpenAI TTS synthesis failed: ${errorMessage}`);
    }
  }

  /**
   * Check if provider is configured with valid API key
   * @returns true if API key is present
   */
  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  /**
   * Get provider type identifier
   * @returns 'openai'
   */
  getProviderType(): string {
    return 'openai';
  }

  /**
   * Get current voice
   * @returns Voice name
   */
  getVoice(): string {
    return this.voice;
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
