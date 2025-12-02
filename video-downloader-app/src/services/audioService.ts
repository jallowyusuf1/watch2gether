import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

/**
 * Audio metadata interface
 */
export interface AudioMetadata {
  duration: number; // Duration in seconds
  bitrate: number; // Bitrate in kbps
  sampleRate: number; // Sample rate in Hz
  format: string; // Audio format (e.g., 'mp3')
  size: number; // File size in bytes
}

/**
 * Progress callback type
 */
export type ProgressCallback = (progress: { ratio: number; time: number }) => void;

/**
 * Audio Extractor Service
 * 
 * Uses FFmpeg.wasm to extract audio from video files and convert to MP3 format.
 * 
 * IMPORTANT NOTES:
 * - FFmpeg.wasm is large (~30MB+) and loads asynchronously
 * - The first initialization may take several seconds
 * - Show appropriate loading states in the UI when using this service
 * - FFmpeg runs entirely in the browser using WebAssembly
 * - No server-side processing required
 * 
 * @example
 * ```typescript
 * const extractor = audioService;
 * await extractor.initialize();
 * const audioBlob = await extractor.extractAudio(videoBlob, (progress) => {
 *   console.log(`Progress: ${(progress.ratio * 100).toFixed(1)}%`);
 * });
 * ```
 */
class AudioExtractor {
  private ffmpeg: FFmpeg | null = null;
  private isInitialized: boolean = false;
  private isInitializing: boolean = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize FFmpeg instance (lazy loading)
   * This method is called automatically on first use, but can be called
   * explicitly to preload FFmpeg and show loading states.
   * 
   * @returns Promise that resolves when FFmpeg is ready
   * @throws Error if initialization fails
   */
  async initialize(): Promise<void> {
    // If already initialized, return immediately
    if (this.isInitialized && this.ffmpeg) {
      return;
    }

    // If currently initializing, return the existing promise
    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    // Start initialization
    this.isInitializing = true;
    this.initPromise = this._doInitialize();

    try {
      await this.initPromise;
      this.isInitialized = true;
    } catch (error) {
      this.isInitializing = false;
      this.initPromise = null;
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Internal initialization method
   */
  private async _doInitialize(): Promise<void> {
    try {
      this.ffmpeg = new FFmpeg();
      
      // Set up logging (optional, for debugging)
      this.ffmpeg.on('log', ({ message }) => {
        console.log('[FFmpeg]', message);
      });

      // Optional: Configure custom paths for FFmpeg files
      // If you want to host FFmpeg files yourself, uncomment and set:
      // this.ffmpeg.load({
      //   coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
      //   wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
      // });

      // Load FFmpeg core and wasm files
      // These are loaded from CDN by default (unpkg.com)
      await this.ffmpeg.load();
      
      console.log('[AudioExtractor] FFmpeg initialized successfully');
    } catch (error) {
      console.error('[AudioExtractor] Failed to initialize FFmpeg:', error);
      throw new Error(
        `Failed to initialize FFmpeg: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        'This may be due to network issues or browser compatibility. ' +
        'FFmpeg.wasm requires a modern browser with WebAssembly support. ' +
        'The initial load may take 10-30 seconds depending on your connection.'
      );
    }
  }

  /**
   * Ensure FFmpeg is initialized before use
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Extract audio from a video blob and convert to MP3
   * 
   * @param videoBlob - The video file as a Blob
   * @param onProgress - Optional callback for progress updates (0-1 ratio)
   * @param quality - Audio quality (0-9, where 0 is best quality, 9 is smallest file)
   *                  Default is 2 (high quality)
   * @returns Promise that resolves to the audio Blob in MP3 format
   * @throws Error if extraction fails
   * 
   * @example
   * ```typescript
   * const audioBlob = await extractor.extractAudio(videoBlob, (progress) => {
   *   console.log(`Extraction progress: ${(progress.ratio * 100).toFixed(1)}%`);
   * });
   * ```
   */
  async extractAudio(
    videoBlob: Blob,
    onProgress?: ProgressCallback,
    quality: number = 2
  ): Promise<Blob> {
    await this.ensureInitialized();

    if (!this.ffmpeg) {
      throw new Error('FFmpeg is not initialized');
    }

    const inputFileName = 'input.mp4';
    const outputFileName = 'output.mp3';

    try {
      // Set up progress tracking
      if (onProgress) {
        this.ffmpeg.on('progress', ({ progress, time }) => {
          // progress is 0-1, time is in milliseconds
          onProgress({ ratio: progress, time });
        });
      }

      // Write video blob to FFmpeg's virtual file system
      const videoData = await fetchFile(videoBlob);
      await this.ffmpeg.writeFile(inputFileName, videoData);

      // Run FFmpeg command to extract audio
      // -i: input file
      // -vn: disable video (no video output)
      // -acodec libmp3lame: use MP3 encoder
      // -q:a 2: audio quality (0=best, 9=worst, 2 is high quality)
      // -y: overwrite output file if it exists
      await this.ffmpeg.exec([
        '-i', inputFileName,
        '-vn', // No video
        '-acodec', 'libmp3lame', // MP3 codec
        '-q:a', quality.toString(), // Quality setting
        '-y', // Overwrite output
        outputFileName
      ]);

      // Read the output file
      const audioData = await this.ffmpeg.readFile(outputFileName);
      
      // Clean up virtual files
      await this.ffmpeg.deleteFile(inputFileName);
      await this.ffmpeg.deleteFile(outputFileName);

      // Convert Uint8Array to Blob
      const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });

      return audioBlob;
    } catch (error) {
      // Clean up on error
      try {
        await this.ffmpeg.deleteFile(inputFileName);
      } catch {}
      try {
        await this.ffmpeg.deleteFile(outputFileName);
      } catch {}

      console.error('[AudioExtractor] Error extracting audio:', error);
      
      if (error instanceof Error) {
        // Provide more specific error messages
        if (error.message.includes('format') || error.message.includes('codec')) {
          throw new Error(
            'Unsupported video format. The video file may be corrupted or in an unsupported format. ' +
            'Please try a different video file.'
          );
        }
        if (error.message.includes('memory') || error.message.includes('allocation')) {
          throw new Error(
            'Insufficient memory to process the video. The file may be too large. ' +
            'Try a smaller video or close other browser tabs.'
          );
        }
        throw new Error(`Failed to extract audio: ${error.message}`);
      }
      
      throw new Error('An unexpected error occurred while extracting audio');
    }
  }

  /**
   * Get audio metadata from an audio blob
   * 
   * @param audioBlob - The audio file as a Blob
   * @returns Promise that resolves to audio metadata
   * @throws Error if metadata extraction fails
   * 
   * @example
   * ```typescript
   * const metadata = await extractor.getAudioMetadata(audioBlob);
   * console.log(`Duration: ${metadata.duration}s, Bitrate: ${metadata.bitrate}kbps`);
   * ```
   */
  async getAudioMetadata(audioBlob: Blob): Promise<AudioMetadata> {
    await this.ensureInitialized();

    if (!this.ffmpeg) {
      throw new Error('FFmpeg is not initialized');
    }

    const inputFileName = 'input_metadata.mp3';

    try {
      // Write audio blob to virtual file system
      const audioData = await fetchFile(audioBlob);
      await this.ffmpeg.writeFile(inputFileName, audioData);

      // Use ffprobe to get metadata (if available) or parse from ffmpeg output
      // For now, we'll use a simpler approach with ffmpeg
      await this.ffmpeg.exec([
        '-i', inputFileName,
        '-f', 'null',
        '-'
      ]);

      // Read FFmpeg logs to extract metadata
      // Note: This is a simplified implementation
      // In a production app, you might want to use a dedicated metadata library
      
      // Clean up
      await this.ffmpeg.deleteFile(inputFileName);

      // For now, return basic metadata from the blob
      // A full implementation would parse FFmpeg output
      return {
        duration: 0, // Would be parsed from FFmpeg output
        bitrate: 0, // Would be parsed from FFmpeg output
        sampleRate: 44100, // Default assumption
        format: 'mp3',
        size: audioBlob.size,
      };
    } catch (error) {
      // Clean up on error
      try {
        await this.ffmpeg.deleteFile(inputFileName);
      } catch {}

      console.error('[AudioExtractor] Error getting audio metadata:', error);
      throw new Error(
        `Failed to get audio metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Trim audio to specific start and end times
   * 
   * @param audioBlob - The audio file as a Blob
   * @param startTime - Start time in seconds
   * @param endTime - End time in seconds (optional, if not provided, trims to end)
   * @param onProgress - Optional callback for progress updates
   * @returns Promise that resolves to the trimmed audio Blob
   * @throws Error if trimming fails
   * 
   * @example
   * ```typescript
   * // Trim audio from 10 seconds to 30 seconds
   * const trimmedAudio = await extractor.trimAudio(audioBlob, 10, 30);
   * ```
   */
  async trimAudio(
    audioBlob: Blob,
    startTime: number,
    endTime?: number,
    onProgress?: ProgressCallback
  ): Promise<Blob> {
    await this.ensureInitialized();

    if (!this.ffmpeg) {
      throw new Error('FFmpeg is not initialized');
    }

    if (startTime < 0) {
      throw new Error('Start time must be non-negative');
    }

    if (endTime !== undefined && endTime <= startTime) {
      throw new Error('End time must be greater than start time');
    }

    const inputFileName = 'input_trim.mp3';
    const outputFileName = 'output_trim.mp3';

    try {
      // Set up progress tracking
      if (onProgress) {
        this.ffmpeg.on('progress', ({ progress, time }) => {
          onProgress({ ratio: progress, time });
        });
      }

      // Write audio blob to virtual file system
      const audioData = await fetchFile(audioBlob);
      await this.ffmpeg.writeFile(inputFileName, audioData);

      // Build FFmpeg command for trimming
      const args: string[] = [
        '-i', inputFileName,
        '-ss', startTime.toString(), // Start time
      ];

      if (endTime !== undefined) {
        args.push('-to', endTime.toString()); // End time
      }

      args.push(
        '-acodec', 'copy', // Copy audio codec (faster, no re-encoding)
        '-y', // Overwrite output
        outputFileName
      );

      await this.ffmpeg.exec(args);

      // Read the output file
      const trimmedData = await this.ffmpeg.readFile(outputFileName);
      
      // Clean up virtual files
      await this.ffmpeg.deleteFile(inputFileName);
      await this.ffmpeg.deleteFile(outputFileName);

      // Convert Uint8Array to Blob
      const trimmedBlob = new Blob([trimmedData], { type: 'audio/mpeg' });

      return trimmedBlob;
    } catch (error) {
      // Clean up on error
      try {
        await this.ffmpeg.deleteFile(inputFileName);
      } catch {}
      try {
        await this.ffmpeg.deleteFile(outputFileName);
      } catch {}

      console.error('[AudioExtractor] Error trimming audio:', error);
      throw new Error(
        `Failed to trim audio: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if FFmpeg is initialized
   * 
   * @returns true if FFmpeg is ready to use
   */
  isReady(): boolean {
    return this.isInitialized && this.ffmpeg !== null;
  }

  /**
   * Check if FFmpeg is currently initializing
   * 
   * @returns true if initialization is in progress
   */
  getInitializing(): boolean {
    return this.isInitializing;
  }

  /**
   * Reset the FFmpeg instance (useful for testing or error recovery)
   * Note: This will require re-initialization on next use
   */
  reset(): void {
    this.ffmpeg = null;
    this.isInitialized = false;
    this.isInitializing = false;
    this.initPromise = null;
  }
}

/**
 * Singleton instance of AudioExtractor
 * 
 * Use this instance throughout the application to avoid
 * multiple FFmpeg initializations.
 * 
 * @example
 * ```typescript
 * import { audioService } from './audioService';
 * 
 * // Initialize (happens automatically on first use)
 * await audioService.initialize();
 * 
 * // Extract audio
 * const audioBlob = await audioService.extractAudio(videoBlob);
 * ```
 */
export const audioService = new AudioExtractor();

