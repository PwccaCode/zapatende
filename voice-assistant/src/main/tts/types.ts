/**
 * Text-to-Speech (TTS) Types
 * Defines provider types, configurations, and audio formats for TTS services
 */

/**
 * Supported TTS provider types
 */
export type TTSProviderType = 'openai' | 'elevenlabs' | 'local';

/**
 * Supported audio output formats
 */
export type TTSOutputFormat = 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';

/**
 * OpenAI TTS voice options
 */
export type TTSOpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

/**
 * TTS synthesis options
 */
export interface TTSSynthesizeOptions {
  /** Audio output format (default: mp3) */
  format?: TTSOutputFormat;
  /** Speaking speed (0.25 to 4.0, default: 1.0) */
  speed?: number;
}

/**
 * TTS synthesis result
 */
export interface TTSSynthesizeResult {
  /** Base64 encoded audio data */
  audio: string;
  /** Audio format (e.g., 'mp3', 'wav') */
  format: string;
  /** Duration in seconds (if available from provider) */
  duration?: number;
  /** Number of characters processed */
  characters: number;
}

/**
 * Base TTS provider configuration
 */
export interface TTSConfig {
  /** Selected TTS provider */
  provider: TTSProviderType;
}

/**
 * OpenAI TTS configuration
 */
export interface TTSOpenAIConfig {
  /** OpenAI API key */
  apiKey: string;
  /** Voice to use (default: alloy) */
  voice?: TTSOpenAIVoice;
  /** Custom OpenAI base URL (optional) */
  baseUrl?: string;
}

/**
 * ElevenLabs TTS configuration
 */
export interface TTSElevenLabsConfig {
  /** ElevenLabs API key */
  apiKey: string;
  /** Voice ID to use */
  voiceId: string;
  /** Model ID (optional, defaults to eleven_multilingual_v2) */
  model?: string;
  /** API base URL (optional, defaults to https://api.elevenlabs.io) */
  baseUrl?: string;
}

/**
 * Local TTS configuration (stub for future implementation)
 */
export interface TTSLocalConfig {
  /** Path to TTS binary (e.g., piper, coqui) */
  binaryPath?: string;
  /** Model path (optional) */
  modelPath?: string;
}

/**
 * Complete TTS configuration for factory
 */
export interface TTSFullConfig extends TTSConfig {
  openai?: TTSOpenAIConfig;
  elevenlabs?: TTSElevenLabsConfig;
  local?: TTSLocalConfig;
}
