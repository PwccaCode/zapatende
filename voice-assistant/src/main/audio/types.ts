/**
 * Audio type definitions for voice assistant pipeline
 */

/**
 * Audio chunk from wppconnect
 */
export interface AudioChunk {
  /** Raw audio data as buffer */
  data: Buffer;
  /** Timestamp when chunk was received */
  timestamp: number;
  /** Sequence number for ordering */
  sequence?: number;
}

/**
 * Supported audio formats
 */
export enum AudioFormat {
  WEBM = 'webm',
  WAV = 'wav',
  OGG = 'ogg',
  MP3 = 'mp3',
  PCM16 = 'pcm16',
}

/**
 * Audio conversion options
 */
export interface AudioConversionOptions {
  /** Target sample rate in Hz (default: 16000 for whisper) */
  sampleRate?: number;
  /** Number of audio channels (default: 1 for mono) */
  channels?: number;
  /** Target audio format */
  format: AudioFormat;
  /** Bitrate (optional) */
  bitrate?: string;
}

/**
 * Audio metadata
 */
export interface AudioMetadata {
  /** Duration in seconds */
  duration: number;
  /** Sample rate in Hz */
  sampleRate: number;
  /** Number of channels */
  channels: number;
  /** Audio format */
  format: AudioFormat;
  /** Bit depth (for PCM) */
  bitDepth?: number;
}
