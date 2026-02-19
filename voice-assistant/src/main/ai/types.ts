/**
 * AI provider types and interfaces
 */

/**
 * Supported AI provider types
 */
export type AIProviderType = 'openai' | 'anthropic' | 'ollama';

/**
 * Message role in conversation
 */
export type AIMessageRole = 'system' | 'user' | 'assistant';

/**
 * Single message in conversation
 */
export interface AIMessage {
  role: AIMessageRole;
  content: string;
}

/**
 * Configuration for AI providers
 */
export interface AIConfig {
  // Provider selection
  provider: AIProviderType;

  // OpenAI config
  openai?: {
    apiKey?: string;
    model?: string;
    baseUrl?: string;
  };

  // Anthropic config
  anthropic?: {
    apiKey?: string;
    model?: string;
  };

  // Ollama config
  ollama?: {
    baseUrl?: string;
    model?: string;
  };
}

/**
 * Options for generating a response
 */
export interface GenerateResponseOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

/**
 * Result from generating a response
 */
export interface GenerateResponseResult {
  text: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Streaming callback type
 */
export type StreamCallback = (chunk: string) => void;
