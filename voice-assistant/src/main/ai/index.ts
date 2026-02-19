/**
 * AI module exports
 * Provides multi-provider AI support for generating responses
 */

// Types
export type {
  AIProviderType,
  AIMessageRole,
  AIMessage,
  AIConfig,
  GenerateResponseOptions,
  GenerateResponseResult,
  StreamCallback,
} from './types';

// Provider interface
export type { AIProvider } from './provider';

// Provider implementations
export { OpenAIProvider } from './openai';
export { AnthropicProvider } from './anthropic';
export { OllamaProvider } from './ollama';

// Factory functions
export {
  createProvider,
  createProviderFromSettings,
  loadAIConfig,
  saveAIConfig,
  getAvailableProviders,
  isProviderConfigured,
} from './factory';
