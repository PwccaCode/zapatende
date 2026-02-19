/**
 * TTS Provider Interface
 * Abstract interface that all TTS providers must implement
 */

import type {
  TTSSynthesizeOptions,
  TTSSynthesizeResult,
} from './types';

/**
 * Text-to-Speech provider interface
 * All TTS providers must implement this interface
 */
export interface TTSProvider {
  /**
   * Synthesize text to speech audio
   * @param text - The text to convert to speech
   * @param options - Optional synthesis parameters
   * @returns Promise with base64 encoded audio result
   */
  synthesize(text: string, options?: TTSSynthesizeOptions): Promise<TTSSynthesizeResult>;

  /**
   * Check if the provider is properly configured with valid credentials
   * @returns true if configured and ready to use
   */
  isConfigured(): boolean;

  /**
   * Get the provider type identifier
   * @returns Provider type string
   */
  getProviderType(): string;

  /**
   * Get the current voice/voice ID being used
   * @returns Voice identifier string
   */
  getVoice(): string;
}
