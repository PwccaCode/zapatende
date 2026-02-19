/**
 * Anthropic (Claude) provider implementation
 */

import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider } from './provider';
import type { AIMessage, GenerateResponseOptions, GenerateResponseResult, StreamCallback } from './types';
import { getSetting } from '../database/settings';

/**
 * Anthropic provider configuration
 */
interface AnthropicProviderConfig {
  apiKey: string;
  model: string;
}

/**
 * Anthropic provider implementation
 */
export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private model: string;

  constructor(config: AnthropicProviderConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
    this.model = config.model || 'claude-3-haiku-20240307';
  }

  /**
   * Create provider from settings
   */
  static fromSettings(): AnthropicProvider | null {
    const apiKey = getSetting('ai.anthropic.apiKey');
    if (!apiKey) {
      return null;
    }

    const model = getSetting('ai.anthropic.model') || 'claude-3-haiku-20240307';

    return new AnthropicProvider({
      apiKey,
      model,
    });
  }

  /**
   * Convert AIMessage to Anthropic message format
   */
  private convertMessages(messages: AIMessage[]): Anthropic.MessageParam[] {
    // Anthropic requires system message to be separate
    const chatMessages: Anthropic.MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        // System messages are handled separately in extractSystemPrompt
        continue;
      } else if (msg.role === 'user') {
        chatMessages.push({ role: 'user', content: msg.content });
      } else if (msg.role === 'assistant') {
        chatMessages.push({ role: 'assistant', content: msg.content });
      }
    }

    return chatMessages as Anthropic.MessageParam[];
  }

  /**
   * Extract system prompt from messages
   */
  private extractSystemPrompt(messages: AIMessage[]): string {
    const systemMsg = messages.find((msg) => msg.role === 'system');
    return systemMsg?.content || '';
  }

  /**
   * Generate a response from Anthropic
   */
  async generateResponse(
    messages: AIMessage[],
    options?: GenerateResponseOptions
  ): Promise<GenerateResponseResult> {
    const systemPrompt = this.extractSystemPrompt(messages);
    const chatMessages = this.convertMessages(messages);

    const response = await this.client.messages.create({
      model: this.model,
      system: systemPrompt || undefined,
      messages: chatMessages,
      max_tokens: options?.maxTokens ?? 1000,
      temperature: options?.temperature ?? 0.7,
      top_p: options?.topP,
    });

    const content =
      response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('') || '';

    const usage = response.usage;

    return {
      text: content,
      model: response.model,
      usage: {
        promptTokens: usage.input_tokens,
        completionTokens: usage.output_tokens,
        totalTokens: usage.input_tokens + usage.output_tokens,
      },
    };
  }

  /**
   * Generate a streaming response from Anthropic
   */
  async streamResponse(
    messages: AIMessage[],
    onChunk: StreamCallback,
    options?: GenerateResponseOptions
  ): Promise<GenerateResponseResult> {
    const systemPrompt = this.extractSystemPrompt(messages);
    const chatMessages = this.convertMessages(messages);

    const stream = await this.client.messages.create({
      model: this.model,
      system: systemPrompt || undefined,
      messages: chatMessages,
      max_tokens: options?.maxTokens ?? 1000,
      temperature: options?.temperature ?? 0.7,
      top_p: options?.topP,
      stream: true,
    });

    let fullContent = '';
    let model = this.model;
    let promptTokens = 0;
    let completionTokens = 0;

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullContent += event.delta.text;
        onChunk(event.delta.text);
      }
      if (event.type === 'message_start') {
        model = event.message.model;
      }
      if (event.type === 'message_delta') {
        if (event.usage) {
          promptTokens = event.usage.input_tokens ?? 0;
          completionTokens = event.usage.output_tokens ?? 0;
        }
      }
    }

    return {
      text: fullContent,
      model,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
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
