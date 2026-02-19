/**
 * whisper.cpp STT provider implementation
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { STTProvider, STTConfig, TranscriptionResult, TranscriptionSegment, STTError } from './types';

/**
 * Default configuration for whisper.cpp
 */
const DEFAULT_CONFIG: STTConfig = {
  whisperBinaryPath: 'main', // Assume 'main' binary from whisper.cpp is in PATH
  modelPath: '', // Will be set by settings
  language: 'auto',
  threads: Math.max(1, Math.floor(os.cpus().length / 2)),
  translate: false,
};

/**
 * Whisper STT provider using whisper.cpp binary
 */
export class WhisperSTTProvider implements STTProvider {
  private config: Required<STTConfig> & { modelPath: string };

  constructor(config: Partial<STTConfig> = {}) {
    this.config = {
      whisperBinaryPath: config.whisperBinaryPath || DEFAULT_CONFIG.whisperBinaryPath!,
      modelPath: config.modelPath || DEFAULT_CONFIG.modelPath!,
      language: config.language || DEFAULT_CONFIG.language!,
      threads: config.threads || DEFAULT_CONFIG.threads!,
      translate: config.translate ?? DEFAULT_CONFIG.translate!,
      extraArgs: config.extraArgs || [],
    };
  }

  /**
   * Transcribe audio buffer using whisper.cpp
   *
   * @param audioBuffer - WAV audio buffer
   * @returns Promise resolving to transcription result
   */
  async transcribe(audioBuffer: Buffer): Promise<TranscriptionResult> {
    // Check if model is configured
    if (!this.config.modelPath) {
      throw new STTError('Whisper model path not configured', 'NO_MODEL');
    }

    // Check if model file exists
    try {
      await fs.access(this.config.modelPath);
    } catch (error) {
      throw new STTError(
        `Whisper model not found at ${this.config.modelPath}`,
        'MODEL_NOT_FOUND'
      );
    }

    try {
      return await this.runWhisper(audioBuffer);
    } catch (error) {
      if (error instanceof STTError) {
        throw error;
      }
      throw new STTError(
        `Whisper transcription failed: ${error instanceof Error ? error.message : String(error)}`,
        'TRANSCRIPTION_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if whisper.cpp binary is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check if model path is set and exists
      if (!this.config.modelPath) {
        return false;
      }
      await fs.access(this.config.modelPath);

      // Try to run whisper with --help to verify binary exists
      await this.executeWhisper(['--help']);

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<STTConfig>): void {
    if (config.whisperBinaryPath) {
      this.config.whisperBinaryPath = config.whisperBinaryPath;
    }
    if (config.modelPath !== undefined) {
      this.config.modelPath = config.modelPath;
    }
    if (config.language) {
      this.config.language = config.language;
    }
    if (config.threads) {
      this.config.threads = config.threads;
    }
    if (config.translate !== undefined) {
      this.config.translate = config.translate;
    }
    if (config.extraArgs) {
      this.config.extraArgs = config.extraArgs;
    }
  }

  /**
   * Run whisper.cpp on audio buffer
   */
  private async runWhisper(audioBuffer: Buffer): Promise<TranscriptionResult> {
    // Create temporary file for audio input
    const tempDir = os.tmpdir();
    const tempInputPath = path.join(tempDir, `whisper_input_${Date.now()}.wav`);
    const tempOutputPath = path.join(tempDir, `whisper_output_${Date.now()}.json`);

    try {
      // Write audio buffer to temp file
      await fs.writeFile(tempInputPath, audioBuffer);

      // Build command arguments
      const args: string[] = [
        '-m', this.config.modelPath,
        '-f', tempInputPath,
        '-oj', // Output JSON
        '-of', tempOutputPath.replace('.json', ''), // Output file prefix
        '-t', this.config.threads.toString(),
      ];

      // Add language if not auto
      if (this.config.language !== 'auto') {
        args.push('-l', this.config.language);
      }

      // Add translation flag if needed
      if (this.config.translate) {
        args.push('-tr');
      }

      // Add extra arguments
      args.push(...this.config.extraArgs);

      // Execute whisper
      await this.executeWhisper(args);

      // Read output JSON
      try {
        const outputData = await fs.readFile(tempOutputPath, 'utf-8');
        return this.parseWhisperOutput(outputData);
      } catch (error) {
        // If JSON output fails, try to get text from stdout
        return {
          text: '',
          language: this.config.language === 'auto' ? undefined : this.config.language,
        };
      }
    } finally {
      // Clean up temp files
      try {
        await fs.unlink(tempInputPath);
      } catch {
        // Ignore cleanup errors
      }
      try {
        await fs.unlink(tempOutputPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Execute whisper binary
   */
  private executeWhisper(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const whisper = spawn(this.config.whisperBinaryPath, args);
      let stdout = '';
      let stderr = '';

      whisper.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      whisper.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      whisper.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(
            new STTError(
              `Whisper exited with code ${code}: ${stderr}`,
              'WHISPER_ERROR'
            )
          );
        }
      });

      whisper.on('error', (error) => {
        reject(
          new STTError(
            `Failed to spawn whisper: ${error.message}`,
            'SPAWN_ERROR',
            error
          )
        );
      });

      // Set timeout
      setTimeout(() => {
        whisper.kill();
        reject(
          new STTError('Whisper transcription timeout', 'TIMEOUT')
        );
      }, 60000); // 60 second timeout
    });
  }

  /**
   * Parse whisper JSON output
   */
  private parseWhisperOutput(json: string): TranscriptionResult {
    try {
      const data = JSON.parse(json);

      // Extract full text from segments
      const segments: TranscriptionSegment[] = data.segments?.map((seg: any) => ({
        text: seg.text?.trim() || '',
        start: seg.t0 || 0,
        end: seg.t1 || 0,
        confidence: seg.p || undefined,
      })) || [];

      const fullText = segments.map(s => s.text).join(' ').trim();

      return {
        text: fullText,
        segments,
        language: data.lang || this.config.language === 'auto' ? undefined : this.config.language,
        duration: data.duration || undefined,
      };
    } catch (error) {
      throw new STTError(
        `Failed to parse whisper output: ${error instanceof Error ? error.message : String(error)}`,
        'PARSE_ERROR'
      );
    }
  }
}

/**
 * Create a WhisperSTTProvider instance
 */
export function createWhisperProvider(config: Partial<STTConfig> = {}): WhisperSTTProvider {
  return new WhisperSTTProvider(config);
}

/**
 * Stub implementation for when whisper binary is not available
 * Useful for development/testing
 */
export class StubSTTProvider implements STTProvider {
  async transcribe(_audioBuffer: Buffer): Promise<TranscriptionResult> {
    // Simulate transcription delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      text: '[Stub transcription - whisper.cpp not configured]',
      language: 'en',
    };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}

/**
 * Create an STT provider with fallback to stub if whisper is not available
 */
export async function createSTTProviderWithFallback(
  config: Partial<STTConfig> = {}
): Promise<STTProvider> {
  const provider = new WhisperSTTProvider(config);
  const available = await provider.isAvailable();
  
  if (available) {
    return provider;
  }
  
  // Return stub if whisper is not available
  console.warn('Whisper.cpp not available, using stub STT provider');
  return new StubSTTProvider();
}
