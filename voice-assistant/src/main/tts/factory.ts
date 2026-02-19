/**
 * TTS Provider Factory
 * Factory functions to create TTS providers from settings or configuration
 */

import { getSetting } from '../database/settings';
import { TTSProvider } from './provider';
import { OpenAITTSProvider } from './openai-tts';
import { ElevenLabsTTSProvider } from './elevenlabs';
import { LocalTTSProvider } from './local-tts';
import type {
  TTSProviderType,
  TTSFullConfig,
  TTSOpenAIVoice,
} from './types';

/**
 * Create a TTS provider by type from settings
 * @param providerType - TTS provider type
 * @returns TTS provider instance or null if not configured
 */
export function createProvider(providerType: TTSProviderType): TTSProvider | null {
  switch (providerType) {
    case 'openai':
      return OpenAITTSProvider.fromSettings();
    case 'elevenlabs':
      return ElevenLabsTTSProvider.fromSettings();
    case 'local':
      return LocalTTSProvider.fromSettings();
    default:
      return null;
  }
}

/**
 * Create a TTS provider from database settings
 * Uses the provider configured in settings or falls back to OpenAI
 * @returns TTS provider instance or null if no provider is configured
 */
export function createProviderFromSettings(): TTSProvider | null {
  const providerType = getSetting('tts.provider') as TTSProviderType;

  if (!providerType) {
    // Default to OpenAI if no provider is set
    return OpenAITTSProvider.fromSettings();
  }

  return createProvider(providerType);
}

/**
 * Load TTS configuration from settings
 * @returns Complete TTS configuration object
 */
export function loadTTSConfig(): TTSFullConfig {
  const provider = (getSetting('tts.provider') || 'openai') as TTSProviderType;
  const config: TTSFullConfig = { provider };

  // Load OpenAI config
  const openaiApiKey = getSetting('tts.openai.apiKey') || getSetting('ai.openai.apiKey');
  const openaiVoice = getSetting('tts.openai.voice') as TTSOpenAIVoice | undefined;
  const openaiBaseUrl = getSetting('tts.openai.baseUrl') || getSetting('ai.openai.baseUrl');

  if (openaiApiKey || openaiVoice || openaiBaseUrl) {
    config.openai = {
      apiKey: openaiApiKey || '',
      voice: openaiVoice,
      baseUrl: openaiBaseUrl || undefined,
    };
  }

  // Load ElevenLabs config
  const elevenlabsApiKey = getSetting('tts.elevenlabs.apiKey');
  const elevenlabsVoiceId = getSetting('tts.elevenlabs.voiceId');
  const elevenlabsModel = getSetting('tts.elevenlabs.model');
  const elevenlabsBaseUrl = getSetting('tts.elevenlabs.baseUrl');

  if (elevenlabsApiKey || elevenlabsVoiceId) {
    config.elevenlabs = {
      apiKey: elevenlabsApiKey || '',
      voiceId: elevenlabsVoiceId || '',
      model: elevenlabsModel || undefined,
      baseUrl: elevenlabsBaseUrl || undefined,
    };
  }

  // Load Local TTS config
  const localBinaryPath = getSetting('tts.local.binaryPath');
  const localModelPath = getSetting('tts.local.modelPath');

  if (localBinaryPath || localModelPath) {
    config.local = {
      binaryPath: localBinaryPath || undefined,
      modelPath: localModelPath || undefined,
    };
  }

  return config;
}

/**
 * Check if any TTS provider is configured
 * @returns true if at least one provider is configured
 */
export function isAnyProviderConfigured(): boolean {
  const openaiApiKey = getSetting('tts.openai.apiKey') || getSetting('ai.openai.apiKey');
  const elevenlabsApiKey = getSetting('tts.elevenlabs.apiKey');
  const localBinaryPath = getSetting('tts.local.binaryPath');

  return !!(openaiApiKey || elevenlabsApiKey || localBinaryPath);
}

/**
 * Get available providers (those that are configured)
 * @returns Array of configured provider types
 */
export function getAvailableProviders(): TTSProviderType[] {
  const providers: TTSProviderType[] = [];

  const openaiApiKey = getSetting('tts.openai.apiKey') || getSetting('ai.openai.apiKey');
  if (openaiApiKey) {
    providers.push('openai');
  }

  const elevenlabsApiKey = getSetting('tts.elevenlabs.apiKey');
  const elevenlabsVoiceId = getSetting('tts.elevenlabs.voiceId');
  if (elevenlabsApiKey && elevenlabsVoiceId) {
    providers.push('elevenlabs');
  }

  const localBinaryPath = getSetting('tts.local.binaryPath');
  if (localBinaryPath) {
    providers.push('local');
  }

  return providers;
}
