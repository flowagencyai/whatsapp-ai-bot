import axios from 'axios';
import FormData from 'form-data';
import { createReadStream, createWriteStream, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import sharp from 'sharp';
import { 
  TranscriptionResult, 
  ProcessedMedia,
  MediaProcessingError,
  AIServiceError 
} from '@/types';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

class AudioProcessor {
  private static instance: AudioProcessor;
  private tempDir: string;

  private constructor() {
    this.tempDir = join(tmpdir(), 'whatsapp-bot');
    this.ensureTempDir();
  }

  public static getInstance(): AudioProcessor {
    if (!AudioProcessor.instance) {
      AudioProcessor.instance = new AudioProcessor();
    }
    return AudioProcessor.instance;
  }

  private ensureTempDir(): void {
    try {
      if (!existsSync(this.tempDir)) {
        require('fs').mkdirSync(this.tempDir, { recursive: true });
      }
    } catch (error) {
      logger.error('Failed to create temp directory', { error: error as Error });
    }
  }

  /**
   * Process audio buffer for transcription
   */
  public async processAudio(
    audioBuffer: Buffer,
    mimeType: string,
    userId: string
  ): Promise<ProcessedMedia> {
    const startTime = Date.now();
    
    try {
      logger.mediaProcessing('audio', audioBuffer.length, userId);

      // Validate audio size
      if (audioBuffer.length > env.bot.audioMaxSize) {
        throw new MediaProcessingError(
          `Audio file too large: ${audioBuffer.length} bytes (max: ${env.bot.audioMaxSize})`,
          'audio',
          audioBuffer.length
        );
      }

      // Validate MIME type
      const supportedTypes = ['audio/ogg', 'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/aac'];
      if (!supportedTypes.includes(mimeType)) {
        logger.warn('Unsupported audio type, attempting to process anyway', {
          userId,
          metadata: { mimeType, supportedTypes }
        });
      }

      const duration = Date.now() - startTime;
      logger.mediaProcessed('audio', duration, userId);

      return {
        buffer: audioBuffer,
        mimeType,
        size: audioBuffer.length,
        processedAt: Date.now(),
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Audio processing failed', { 
        error: error as Error, 
        userId,
        duration,
        metadata: { size: audioBuffer.length, mimeType }
      });
      
      if (error instanceof MediaProcessingError) {
        throw error;
      }
      throw new MediaProcessingError(
        `Audio processing failed: ${(error as Error).message}`,
        'audio',
        audioBuffer.length
      );
    }
  }

  /**
   * Transcribe audio using Groq Whisper API
   */
  public async transcribeAudio(
    audioBuffer: Buffer,
    mimeType: string,
    userId: string
  ): Promise<TranscriptionResult> {
    const startTime = Date.now();
    let tempFilePath: string | null = null;

    try {
      logger.transcriptionRequest(userId, audioBuffer.length);

      // Create temporary file
      const fileExtension = this.getFileExtension(mimeType);
      tempFilePath = join(this.tempDir, `audio_${Date.now()}_${Math.random().toString(36)}.${fileExtension}`);
      
      // Write buffer to temporary file
      await this.writeBufferToFile(audioBuffer, tempFilePath);

      // Prepare form data
      const formData = new FormData();
      formData.append('file', createReadStream(tempFilePath));
      formData.append('model', env.groq.model);
      formData.append('language', 'pt'); // Portuguese
      formData.append('response_format', 'verbose_json'); // Get detailed response

      // Make request to Groq API
      const response = await axios.post(
        'https://api.groq.com/openai/v1/audio/transcriptions',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${env.groq.apiKey}`,
            ...formData.getHeaders(),
          },
          timeout: env.bot.messageTimeout,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      // Parse response
      const transcriptionData = response.data;
      
      if (!transcriptionData.text) {
        throw new AIServiceError('Empty transcription from Groq', 'groq', env.groq.model);
      }

      const duration = Date.now() - startTime;
      logger.transcriptionComplete(userId, duration, transcriptionData.text.length);

      return {
        text: transcriptionData.text.trim(),
        language: transcriptionData.language || 'pt',
        duration: transcriptionData.duration,
        confidence: this.calculateConfidence(transcriptionData),
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Audio transcription failed', { 
        error: error as Error, 
        userId,
        duration,
        metadata: { 
          size: audioBuffer.length, 
          mimeType,
          groqModel: env.groq.model
        }
      });

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new AIServiceError('Groq authentication failed', 'groq', env.groq.model);
        } else if (error.response?.status === 429) {
          throw new AIServiceError('Groq rate limit exceeded', 'groq', env.groq.model);
        } else if (error.response?.status === 413) {
          throw new AIServiceError('Audio file too large for Groq API', 'groq', env.groq.model);
        } else if (error.response?.status >= 500) {
          throw new AIServiceError('Groq service unavailable', 'groq', env.groq.model);
        }
      }

      throw new AIServiceError(
        `Transcription failed: ${(error as Error).message}`,
        'groq',
        env.groq.model
      );

    } finally {
      // Clean up temporary file
      if (tempFilePath && existsSync(tempFilePath)) {
        try {
          unlinkSync(tempFilePath);
        } catch (error) {
          logger.warn('Failed to clean up temp file', { 
            metadata: { tempFilePath },
            error: error as Error
          });
        }
      }
    }
  }

  /**
   * Process image buffer for analysis
   */
  public async processImage(
    imageBuffer: Buffer,
    mimeType: string,
    userId: string
  ): Promise<ProcessedMedia> {
    const startTime = Date.now();
    
    try {
      logger.mediaProcessing('image', imageBuffer.length, userId);

      // Validate image size
      if (imageBuffer.length > env.bot.imageMaxSize) {
        throw new MediaProcessingError(
          `Image file too large: ${imageBuffer.length} bytes (max: ${env.bot.imageMaxSize})`,
          'image',
          imageBuffer.length
        );
      }

      // Validate and convert image if needed
      let processedBuffer = imageBuffer;
      let processedMimeType = mimeType;

      try {
        // Use Sharp to validate and optimize image
        const image = sharp(imageBuffer);
        const metadata = await image.metadata();
        
        // Convert to JPEG if not already (for better compatibility and smaller size)
        if (mimeType !== 'image/jpeg' && mimeType !== 'image/jpg') {
          processedBuffer = await image
            .jpeg({ quality: 85 })
            .toBuffer();
          processedMimeType = 'image/jpeg';
          
          logger.debug('Image converted to JPEG', { 
            userId,
            metadata: { 
              originalType: mimeType, 
              originalSize: imageBuffer.length,
              newSize: processedBuffer.length 
            }
          });
        }

        // Resize if image is too large (max 2048px on longest side)
        const maxDimension = 2048;
        if (metadata.width && metadata.height) {
          const longestSide = Math.max(metadata.width, metadata.height);
          
          if (longestSide > maxDimension) {
            const image = sharp(processedBuffer);
            processedBuffer = await image
              .resize(maxDimension, maxDimension, { 
                fit: 'inside',
                withoutEnlargement: true 
              })
              .jpeg({ quality: 85 })
              .toBuffer();
            
            logger.debug('Image resized', { 
              userId,
              metadata: { 
                originalDimensions: `${metadata.width}x${metadata.height}`,
                maxDimension,
                newSize: processedBuffer.length 
              }
            });
          }
        }

      } catch (sharpError) {
        // If Sharp fails, log but continue with original buffer
        logger.warn('Image optimization failed, using original', {
          userId,
          error: sharpError as Error,
          metadata: { mimeType, size: imageBuffer.length }
        });
        processedBuffer = imageBuffer;
        processedMimeType = mimeType;
      }

      const duration = Date.now() - startTime;
      logger.mediaProcessed('image', duration, userId);

      return {
        buffer: processedBuffer,
        mimeType: processedMimeType,
        size: processedBuffer.length,
        originalName: `image_${Date.now()}.${this.getFileExtension(processedMimeType)}`,
        processedAt: Date.now(),
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Image processing failed', { 
        error: error as Error, 
        userId,
        duration,
        metadata: { size: imageBuffer.length, mimeType }
      });
      
      if (error instanceof MediaProcessingError) {
        throw error;
      }
      throw new MediaProcessingError(
        `Image processing failed: ${(error as Error).message}`,
        'image',
        imageBuffer.length
      );
    }
  }

  /**
   * Convert processed media to base64 data URL for API usage
   */
  public bufferToDataUrl(buffer: Buffer, mimeType: string): string {
    const base64 = buffer.toString('base64');
    return `data:${mimeType};base64,${base64}`;
  }

  /**
   * Validate media type and size
   */
  public validateMedia(
    buffer: Buffer,
    mimeType: string,
    mediaType: 'audio' | 'image'
  ): { valid: boolean; error?: string } {
    try {
      const maxSize = mediaType === 'audio' ? env.bot.audioMaxSize : env.bot.imageMaxSize;
      
      if (buffer.length > maxSize) {
        return {
          valid: false,
          error: `${mediaType} file too large: ${buffer.length} bytes (max: ${maxSize})`
        };
      }

      const supportedTypes = mediaType === 'audio' 
        ? ['audio/ogg', 'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/aac']
        : ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

      if (!supportedTypes.some(type => mimeType.includes(type.split('/')[1]))) {
        return {
          valid: false,
          error: `Unsupported ${mediaType} type: ${mimeType}`
        };
      }

      return { valid: true };

    } catch (error) {
      return {
        valid: false,
        error: `Validation failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Get appropriate file extension for mime type
   */
  private getFileExtension(mimeType: string): string {
    const extensions: Record<string, string> = {
      'audio/ogg': 'ogg',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/m4a': 'm4a',
      'audio/aac': 'aac',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    };

    return extensions[mimeType] || 'bin';
  }

  /**
   * Write buffer to file asynchronously
   */
  private async writeBufferToFile(buffer: Buffer, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const writeStream = createWriteStream(filePath);
      
      writeStream.on('error', reject);
      writeStream.on('finish', resolve);
      
      writeStream.write(buffer);
      writeStream.end();
    });
  }

  /**
   * Calculate confidence score from Groq response
   */
  private calculateConfidence(transcriptionData: any): number {
    // Groq doesn't provide direct confidence scores
    // Calculate based on available data
    try {
      const textLength = transcriptionData.text?.length || 0;
      const duration = transcriptionData.duration || 1;
      
      // Basic heuristic: longer text per second usually means better recognition
      const wordsPerSecond = (textLength / duration) / 5; // Assume 5 chars per word
      
      // Normalize to 0-1 range
      const confidence = Math.min(0.95, Math.max(0.1, wordsPerSecond / 3));
      
      return Math.round(confidence * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      return 0.8; // Default confidence
    }
  }

  /**
   * Health check for audio processing
   */
  public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: Record<string, unknown> }> {
    try {
      // Check temp directory
      const tempDirExists = existsSync(this.tempDir);
      
      // Test Sharp library
      let sharpWorking = false;
      try {
        const testBuffer = Buffer.from('test');
        await sharp({
          create: {
            width: 1,
            height: 1,
            channels: 3,
            background: { r: 255, g: 255, b: 255 }
          }
        }).png().toBuffer();
        sharpWorking = true;
      } catch (error) {
        // Sharp test failed
      }

      // Test Groq API connectivity (without actual request)
      const groqConfigValid = env.groq.apiKey.startsWith('gsk_');

      return {
        status: tempDirExists && sharpWorking && groqConfigValid ? 'healthy' : 'unhealthy',
        details: {
          tempDirExists,
          tempDirPath: this.tempDir,
          sharpWorking,
          groqConfigValid,
          maxAudioSize: env.bot.audioMaxSize,
          maxImageSize: env.bot.imageMaxSize,
          groqModel: env.groq.model,
        },
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: (error as Error).message,
        },
      };
    }
  }

  /**
   * Clean up old temporary files
   */
  public async cleanup(): Promise<void> {
    try {
      const fs = require('fs').promises;
      const files = await fs.readdir(this.tempDir);
      
      let cleanedCount = 0;
      const maxAge = 60 * 60 * 1000; // 1 hour
      const now = Date.now();

      for (const file of files) {
        const filePath = join(this.tempDir, file);
        try {
          const stats = await fs.stat(filePath);
          const age = now - stats.mtime.getTime();
          
          if (age > maxAge) {
            await fs.unlink(filePath);
            cleanedCount++;
          }
        } catch (error) {
          // File might have been deleted already, continue
        }
      }

      logger.info(`Temp files cleanup completed: ${cleanedCount} files removed`);
    } catch (error) {
      logger.error('Temp files cleanup failed', { error: error as Error });
    }
  }
}

// Export singleton instance
export const audioProcessor = AudioProcessor.getInstance();

// Export type for dependency injection
export type { AudioProcessor };