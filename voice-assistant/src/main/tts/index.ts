/**
 * Text-to-Speech (TTS) Module
 * Provides multi-provider TTS support for converting AI responses to speech
 */

// Provider interface
export type { TTSProvider } from './provider';

// Provider implementations
export { OpenAITTSProvider } from './openai-tts';
export { ElevenLabsTTSProvider } from './elevenlabs';
export { LocalTTSProvider } from './local-tts';

// Factory functions
export {
  createProvider,
  createProviderFromSettings,
  loadTTSConfig,
  isAnyProviderConfigured,
  getAvailableProviders,
} from './factory';

// Types
export type {
  TTSProviderType,
  TTSOutputFormat,
  TTSOpenAIVoice,
  TTSSynthesizeOptions,
  TTSSynthesizeResult,
  TTSConfig,
  TTSOpenAIConfig,
  TTSElevenLabsConfig,
  TTSLocalConfig,
  TTSFullConfig,
} from './types';
