/**
 * Abstract AI provider interface
 * All AI providers (OpenAI, Anthropic, Ollama) must implement this interface
 */

import type { AIMessage, GenerateResponseOptions, GenerateResponseResult, StreamCallback } from './types';

/**
 * Base interface for all AI providers
 */
export interface AIProvider {
  /**
   * Generate a response from the AI model
   * @param messages - Array of conversation messages
   * @param options - Optional generation parameters (temperature, maxTokens, etc.)
   * @returns Promise with generated response and metadata
   */
  generateResponse(messages: AIMessage[], options?: GenerateResponseOptions): Promise<GenerateResponseResult>;

  /**
   * Generate a streaming response from the AI model
   * @param messages - Array of conversation messages
   * @param onChunk - Callback for each text chunk as it arrives
   * @param options - Optional generation parameters
   * @returns Promise with final response and metadata
   */
  streamResponse(
    messages: AIMessage[],
    onChunk: StreamCallback,
    options?: GenerateResponseOptions
  ): Promise<GenerateResponseResult>;

  /**
   * Check if the provider is properly configured and ready to use
   * @returns true if provider can make requests
   */
  isConfigured(): boolean;

  /**
   * Get the model name being used
   * @returns The model identifier
   */
  getModel(): string;
}
