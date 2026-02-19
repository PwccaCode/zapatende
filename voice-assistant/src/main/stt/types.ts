/**
 * Speech-to-text type definitions
 */

/**
 * Transcription result from STT provider
 */
export interface TranscriptionResult {
  /** Transcribed text */
  text: string;
  /** Confidence score (0-1) if available */
  confidence?: number;
  /** Segments of transcription with timestamps */
  segments?: TranscriptionSegment[];
  /** Language detected if available */
  language?: string;
  /** Duration in seconds */
  duration?: number;
}

/**
 * Transcription segment with timing information
 */
export interface TranscriptionSegment {
  /** Text segment */
  text: string;
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
  /** Confidence score (0-1) if available */
  confidence?: number;
}

/**
 * STT configuration options
 */
export interface STTConfig {
  /** Path to whisper.cpp binary */
  whisperBinaryPath?: string;
  /** Path to whisper model file */
  modelPath?: string;
  /** Language code (e.g., 'en', 'pt', 'auto' for auto-detect) */
  language?: string;
  /** Number of threads to use */
  threads?: number;
  /** Enable translation to English */
  translate?: boolean;
  /** Additional arguments to pass to whisper binary */
  extraArgs?: string[];
}

/**
 * STT provider interface
 */
export interface STTProvider {
  /**
   * Transcribe audio buffer to text
   *
   * @param audioBuffer - Audio buffer (WAV format)
   * @returns Promise resolving to transcription result
   */
  transcribe(audioBuffer: Buffer): Promise<TranscriptionResult>;

  /**
   * Check if provider is available/configured
   *
   * @returns Promise resolving to true if available
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Error class for STT errors
 */
export class STTError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'STTError';
  }
}
