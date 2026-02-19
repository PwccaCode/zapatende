/**
 * OpenAI provider implementation
 */

import OpenAI from 'openai';
import type { AIProvider } from './provider';
import type { AIMessage, GenerateResponseOptions, GenerateResponseResult, StreamCallback } from './types';
import { getSetting } from '../database/settings';

/**
 * OpenAI provider configuration
 */
interface OpenAIProviderConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor(config: OpenAIProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
    this.model = config.model || 'gpt-4o-mini';
  }

  /**
   * Create provider from settings
   */
  static fromSettings(): OpenAIProvider | null {
    const apiKey = getSetting('ai.openai.apiKey');
    if (!apiKey) {
      return null;
    }

    const model = getSetting('ai.openai.model') || 'gpt-4o-mini';
    const baseUrl = getSetting('ai.openai.baseUrl') || undefined;

    return new OpenAIProvider({
      apiKey,
      model,
      baseUrl,
    });
  }

  /**
   * Convert AIMessage to OpenAI message format
   */
  private convertMessages(messages: AIMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
    return messages.map((msg) => {
      if (msg.role === 'system') {
        return { role: 'system' as const, content: msg.content };
      }
      if (msg.role === 'assistant') {
        return { role: 'assistant' as const, content: msg.content };
      }
      return { role: 'user' as const, content: msg.content };
    });
  }

  /**
   * Generate a response from OpenAI
   */
  async generateResponse(
    messages: AIMessage[],
    options?: GenerateResponseOptions
  ): Promise<GenerateResponseResult> {
    const openaiMessages = this.convertMessages(messages);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: openaiMessages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1000,
      top_p: options?.topP,
    });

    const content = response.choices[0]?.message?.content || '';
    const usage = response.usage;

    return {
      text: content,
      model: response.model,
      usage: usage
        ? {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
          }
        : undefined,
    };
  }

  /**
   * Generate a streaming response from OpenAI
   */
  async streamResponse(
    messages: AIMessage[],
    onChunk: StreamCallback,
    options?: GenerateResponseOptions
  ): Promise<GenerateResponseResult> {
    const openaiMessages = this.convertMessages(messages);

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: openaiMessages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1000,
      top_p: options?.topP,
      stream: true,
    });

    let fullContent = '';
    let model = this.model;
    let promptTokens = 0;
    let completionTokens = 0;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        fullContent += delta.content;
        onChunk(delta.content);
      }
      if (chunk.model) {
        model = chunk.model;
      }
      if (chunk.usage) {
        promptTokens = chunk.usage.prompt_tokens;
        completionTokens = chunk.usage.completion_tokens;
      }
    }

    return {
      text: fullContent,
      model,
      usage: promptTokens || completionTokens
        ? {
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
          }
        : undefined,
    };
  }

  /**
   * Check if the provider is configured
   */
  isConfigured(): boolean {
    return !!this.client.apiKey;
  }

  /**
   * Get the current model name
   */
  getModel(): string {
    return this.model;
  }
}
