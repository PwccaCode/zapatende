/**
 * Local TTS Provider
 * Stub implementation for local TTS (piper, coqui, etc.)
 * Placeholder for future implementation
 */

import { TTSProvider } from './provider';
import type {
  TTSSynthesizeOptions,
  TTSSynthesizeResult,
  TTSLocalConfig,
} from './types';

/**
 * Local TTS provider implementation (stub)
 * This is a placeholder for future implementation using:
 * - Piper: https://github.com/rhasspy/piper
 * - Coqui TTS: https://github.com/coqui-ai/TTS
 * - Other local TTS solutions
 */
export class LocalTTSProvider implements TTSProvider {
  private binaryPath?: string;
  private modelPath?: string;
  private configured: boolean;

  /**
   * Create a new local TTS provider
   * @param config - Local TTS configuration
   */
  constructor(config: TTSLocalConfig = {}) {
    this.binaryPath = config.binaryPath;
    this.modelPath = config.modelPath;
    this.configured = false; // Stub: not actually configured
  }

  /**
   * Create provider from database settings
   * @returns LocalTTSProvider instance or null if not configured
   */
  static fromSettings(): LocalTTSProvider | null {
    // For now, always return null since it's a stub
    // Once implemented, check if binary exists and is executable
    return null;
  }

  /**
   * Synthesize text to speech using local TTS binary
   * @param _text - Text to synthesize
   * @param _options - Synthesis options
   * @returns Promise with base64 encoded audio
   */
  async synthesize(_text: string, _options?: TTSSynthesizeOptions): Promise<TTSSynthesizeResult> {
    // Stub: Local TTS not yet implemented
    throw new Error(
      'Local TTS is not yet implemented. ' +
      'To use local TTS, you need to integrate a local engine like Piper or Coqui TTS. ' +
      'See https://github.com/rhasspy/piper for a fast, local neural TTS engine.'
    );
  }

  /**
   * Check if provider is configured with valid binary path
   * @returns true if binary path is configured and executable
   */
  isConfigured(): boolean {
    return this.configured;
  }

  /**
   * Get provider type identifier
   * @returns 'local'
   */
  getProviderType(): string {
    return 'local';
  }

  /**
   * Get current voice/model
   * @returns Model path or name
   */
  getVoice(): string {
    return this.modelPath || 'unknown';
  }

  /**
   * Get binary path
   * @returns Path to TTS binary
   */
  getBinaryPath(): string | undefined {
    return this.binaryPath;
  }

  /**
   * Check if local TTS is available (binary exists)
   * @returns true if binary is available on the system
   */
  async isAvailable(): Promise<boolean> {
    // Stub: Check if binary exists and is executable
    return false;
  }
}

