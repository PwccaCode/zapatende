/**
 * Factory for creating AI provider instances
 */

import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { OllamaProvider } from './ollama';
import type { AIProvider } from './provider';
import type { AIProviderType, AIConfig } from './types';
import { getSetting } from '../database/settings';

/**
 * Create an AI provider by type
 * @param providerType - The type of provider to create
 * @returns An AI provider instance or null if not configured
 */
export function createProvider(providerType: AIProviderType): AIProvider | null {
  switch (providerType) {
    case 'openai':
      return OpenAIProvider.fromSettings();
    case 'anthropic':
      return AnthropicProvider.fromSettings();
    case 'ollama':
      return OllamaProvider.fromSettings();
    default:
      return null;
  }
}

/**
 * Create an AI provider from settings
 * This reads the provider type from settings and creates the appropriate instance
 * @returns An AI provider instance or null if not configured
 */
export function createProviderFromSettings(): AIProvider | null {
  const providerType = getSetting('ai.provider') as AIProviderType;

  if (!providerType) {
    // Default to OpenAI if no provider is set
    return OpenAIProvider.fromSettings();
  }

  return createProvider(providerType);
}

/**
 * Load AI configuration from settings
 * @returns AI configuration object
 */
export function loadAIConfig(): AIConfig {
  const provider = (getSetting('ai.provider') || 'openai') as AIProviderType;

  const config: AIConfig = {
    provider,
  };

  // Load OpenAI config
  const openaiApiKey = getSetting('ai.openai.apiKey');
  const openaiModel = getSetting('ai.openai.model');
  const openaiBaseUrl = getSetting('ai.openai.baseUrl');

  if (openaiApiKey || openaiModel || openaiBaseUrl) {
    config.openai = {
      apiKey: openaiApiKey || undefined,
      model: openaiModel || undefined,
      baseUrl: openaiBaseUrl || undefined,
    };
  }

  // Load Anthropic config
  const anthropicApiKey = getSetting('ai.anthropic.apiKey');
  const anthropicModel = getSetting('ai.anthropic.model');

  if (anthropicApiKey || anthropicModel) {
    config.anthropic = {
      apiKey: anthropicApiKey || undefined,
      model: anthropicModel || undefined,
    };
  }

  // Load Ollama config
  const ollamaBaseUrl = getSetting('ai.ollama.baseUrl');
  const ollamaModel = getSetting('ai.ollama.model');

  if (ollamaBaseUrl || ollamaModel) {
    config.ollama = {
      baseUrl: ollamaBaseUrl || undefined,
      model: ollamaModel || undefined,
    };
  }

  return config;
}

/**
 * Save AI configuration to settings
 * @param config - AI configuration object
 */
export function saveAIConfig(config: AIConfig): void {
  // Save provider type
  setSetting('ai.provider', config.provider);

  // Save OpenAI config
  if (config.openai) {
    if (config.openai.apiKey) setSetting('ai.openai.apiKey', config.openai.apiKey);
    if (config.openai.model) setSetting('ai.openai.model', config.openai.model);
    if (config.openai.baseUrl) setSetting('ai.openai.baseUrl', config.openai.baseUrl);
  }

  // Save Anthropic config
  if (config.anthropic) {
    if (config.anthropic.apiKey) setSetting('ai.anthropic.apiKey', config.anthropic.apiKey);
    if (config.anthropic.model) setSetting('ai.anthropic.model', config.anthropic.model);
  }

  // Save Ollama config
  if (config.ollama) {
    if (config.ollama.baseUrl) setSetting('ai.ollama.baseUrl', config.ollama.baseUrl);
    if (config.ollama.model) setSetting('ai.ollama.model', config.ollama.model);
  }
}

/**
 * Helper function to set a setting
 * Re-imported here to avoid circular dependency
 */
function setSetting(key: string, value: string): void {
  const { setSetting: _setSetting } = require('../database/settings');
  _setSetting(key, value);
}

/**
 * Get a list of available providers
 * A provider is considered available if it has the required configuration
 */
export function getAvailableProviders(): AIProviderType[] {
  const available: AIProviderType[] = [];

  // Check OpenAI
  if (getSetting('ai.openai.apiKey')) {
    available.push('openai');
  }

  // Check Anthropic
  if (getSetting('ai.anthropic.apiKey')) {
    available.push('anthropic');
  }

  // Ollama is always available (it uses local server)
  available.push('ollama');

  return available;
}

/**
 * Validate that a provider is properly configured
 * @param providerType - The type of provider to validate
 * @returns true if the provider is configured
 */
export function isProviderConfigured(providerType: AIProviderType): boolean {
  const provider = createProvider(providerType);
  return provider?.isConfigured() ?? false;
}
