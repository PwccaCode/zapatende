/**
 * Ollama (local LLM) provider implementation
 */

import type { AIProvider } from './provider';
import type { AIMessage, GenerateResponseOptions, GenerateResponseResult, StreamCallback } from './types';
import { getSetting } from '../database/settings';

/**
 * Ollama provider configuration
 */
interface OllamaProviderConfig {
  baseUrl: string;
  model: string;
}

/**
 * Ollama API response types
 */
interface OllamaMessage {
  role: string;
  content: string;
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  message: OllamaMessage;
  done: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
}

/**
 * Ollama provider implementation using REST API
 */
export class OllamaProvider implements AIProvider {
  private baseUrl: string;
  private model: string;

  constructor(config: OllamaProviderConfig) {
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    this.model = config.model || 'llama3.2';
  }

  /**
   * Create provider from settings
   */
  static fromSettings(): OllamaProvider | null {
    const baseUrl = getSetting('ai.ollama.baseUrl');
    const model = getSetting('ai.ollama.model');

    // Ollama can work even with no settings (use defaults)
    return new OllamaProvider({
      baseUrl: baseUrl || 'http://localhost:11434',
      model: model || 'llama3.2',
    });
  }

  /**
   * Convert AIMessage to Ollama message format
   */
  private convertMessages(messages: AIMessage[]): OllamaMessage[] {
    return messages.map((msg) => ({
      role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));
  }

  /**
   * Make a request to Ollama API
   */
  private async request<T>(endpoint: string, body: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Generate a response from Ollama
   */
  async generateResponse(
    messages: AIMessage[],
    options?: GenerateResponseOptions
  ): Promise<GenerateResponseResult> {
    const ollamaMessages = this.convertMessages(messages);

    const response = await this.request<OllamaGenerateResponse>('/api/chat', {
      model: this.model,
      messages: ollamaMessages,
      stream: false,
      options: {
        temperature: options?.temperature ?? 0.7,
        num_predict: options?.maxTokens ?? 1000,
        top_p: options?.topP,
      },
    });

    return {
      text: response.message?.content || '',
      model: response.model,
      usage:
        response.prompt_eval_count !== undefined || response.eval_count !== undefined
          ? {
              promptTokens: response.prompt_eval_count || 0,
              completionTokens: response.eval_count || 0,
              totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0),
            }
          : undefined,
    };
  }

  /**
   * Generate a streaming response from Ollama
   */
  async streamResponse(
    messages: AIMessage[],
    onChunk: StreamCallback,
    options?: GenerateResponseOptions
  ): Promise<GenerateResponseResult> {
    const ollamaMessages = this.convertMessages(messages);

    const url = `${this.baseUrl}/api/chat`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: ollamaMessages,
        stream: true,
        options: {
          temperature: options?.temperature ?? 0.7,
          num_predict: options?.maxTokens ?? 1000,
          top_p: options?.topP,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    let fullContent = '';
    let model = this.model;
    let promptTokens = 0;
    let completionTokens = 0;

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body from Ollama API');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process each line (one JSON object per line)
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const chunk: OllamaGenerateResponse = JSON.parse(line);
          if (chunk.message?.content) {
            fullContent += chunk.message.content;
            onChunk(chunk.message.content);
          }
          if (chunk.model) {
            model = chunk.model;
          }
          if (chunk.prompt_eval_count !== undefined) {
            promptTokens = chunk.prompt_eval_count;
          }
          if (chunk.eval_count !== undefined) {
            completionTokens = chunk.eval_count;
          }

          if (chunk.done) {
            break;
          }
        } catch (e) {
          // Skip invalid JSON lines
          console.warn('Failed to parse Ollama streaming response:', e);
        }
      }
    }

    return {
      text: fullContent,
      model,
      usage:
        promptTokens !== 0 || completionTokens !== 0
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
    // Ollama is always considered configured if the server is running
    // We'll check connectivity on actual use
    return true;
  }

  /**
   * Get the current model name
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Test connection to Ollama server
   */
  async testConnection(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/api/tags`;
      const response = await fetch(url);
      return response.ok;
    } catch {
      return false;
    }
  }
}
