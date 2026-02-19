/**
 * Audio format converter using ffmpeg
 */

import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';
import { AudioFormat, AudioConversionOptions, AudioMetadata } from './types';

/**
 * Default conversion options optimized for whisper.cpp
 */
const DEFAULT_OPTIONS: AudioConversionOptions = {
  sampleRate: 16000,
  channels: 1,
  format: AudioFormat.WAV,
};

/**
 * Error class for audio conversion errors
 */
export class AudioConversionError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'AudioConversionError';
  }
}

/**
 * Convert base64 webm audio to WAV buffer
 *
 * @param base64Audio - Base64 encoded webm audio data
 * @param options - Conversion options (optional)
 * @returns Promise resolving to WAV buffer
 * @throws AudioConversionError if conversion fails
 */
export async function webmBase64ToWav(
  base64Audio: string,
  options: Partial<AudioConversionOptions> = {}
): Promise<Buffer> {
  const opts: AudioConversionOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  try {
    // Remove data URL prefix if present
    const cleanBase64 = base64Audio.replace(/^data:audio\/webm;base64,/, '');

    // Decode base64 to buffer
    const inputBuffer = Buffer.from(cleanBase64, 'base64');

    return await convertBuffer(inputBuffer, opts);
  } catch (error) {
    if (error instanceof AudioConversionError) {
      throw error;
    }
    throw new AudioConversionError(
      `Failed to convert webm base64 to wav: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Convert audio buffer to target format
 *
 * @param inputBuffer - Input audio buffer
 * @param options - Conversion options
 * @returns Promise resolving to converted audio buffer
 * @throws AudioConversionError if conversion fails
 */
export async function convertBuffer(
  inputBuffer: Buffer,
  options: AudioConversionOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const inputFormat = 'webm'; // Default input format from wppconnect
    const outputFormat = options.format;

    const chunks: Buffer[] = [];

    // Create ffmpeg command
    const command = ffmpeg(Readable.from(inputBuffer), {
      timeout: 30000, // 30 second timeout
    })
      .inputFormat(inputFormat)
      .toFormat(outputFormat)
      .audioFrequency(options.sampleRate || 16000)
      .audioChannels(options.channels || 1)
      .on('error', (err) => {
        reject(
          new AudioConversionError(
            `FFmpeg error: ${err.message}`,
            err
          )
        );
      })
      .on('end', () => {
        // Combine all chunks into single buffer
        const outputBuffer = Buffer.concat(chunks);
        resolve(outputBuffer);
      });

    // Set bitrate if specified
    if (options.bitrate) {
      command.audioBitrate(options.bitrate);
    }

    // Pipe output to buffer
    command.pipe()
      .on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      })
      .on('error', (err: Error) => {
        reject(
          new AudioConversionError(
            `Stream error: ${err.message}`,
            err
          )
        );
      });
  });
}

/**
 * Get audio metadata from buffer
 *
 * @param buffer - Audio buffer
 * @returns Promise resolving to audio metadata
 * @throws AudioConversionError if metadata extraction fails
 */
export async function getAudioMetadata(
  buffer: Buffer
): Promise<AudioMetadata> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    ffmpeg(Readable.from(buffer))
      .toFormat('null') // Don't actually convert, just probe
      .outputOptions('-f', 'null')
      .on('error', (err) => {
        reject(
          new AudioConversionError(
            `Failed to get metadata: ${err.message}`,
            err
          )
        );
      })
      .on('end', () => {
        // FFprobe information would normally be extracted here
        // For now, return basic defaults
        resolve({
          duration: 0,
          sampleRate: 16000,
          channels: 1,
          format: AudioFormat.WAV,
          bitDepth: 16,
        });
      })
      .pipe()
      .on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
  });
}

/**
 * Check if ffmpeg is available in PATH
 *
 * @returns Promise resolving to true if ffmpeg is available
 */
export async function isFfmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err, formats) => {
      if (err) {
        resolve(false);
        return;
      }
      resolve(formats != null);
    });
  });
}
