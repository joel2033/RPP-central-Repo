import sharp from 'sharp';
import { s3Service } from './s3Service';

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export class ThumbnailService {
  private static instance: ThumbnailService;
  
  private constructor() {}
  
  static getInstance(): ThumbnailService {
    if (!ThumbnailService.instance) {
      ThumbnailService.instance = new ThumbnailService();
    }
    return ThumbnailService.instance;
  }

  /**
   * Generate thumbnail from file buffer
   */
  async generateThumbnail(
    fileBuffer: Buffer,
    options: ThumbnailOptions = {}
  ): Promise<Buffer> {
    const {
      width = 300,
      height = 300,
      quality = 85,
      format = 'jpeg'
    } = options;

    try {
      let sharpInstance = sharp(fileBuffer)
        .resize(width, height, {
          fit: 'cover',
          position: 'center'
        });

      // Apply format-specific settings
      switch (format) {
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({ quality, progressive: true });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({ quality });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({ quality });
          break;
      }

      return await sharpInstance.toBuffer();
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      throw new Error('Failed to generate thumbnail');
    }
  }

  /**
   * Generate thumbnail S3 key
   */
  generateThumbnailKey(originalS3Key: string): string {
    // Extract path components
    const pathParts = originalS3Key.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const fileNameWithoutExt = fileName.split('.').slice(0, -1).join('.');
    const pathWithoutFile = pathParts.slice(0, -1).join('/');
    
    return `${pathWithoutFile}/thumbs/${fileNameWithoutExt}_thumb.jpg`;
  }

  /**
   * Upload thumbnail to S3 and return the S3 key
   */
  async uploadThumbnail(
    jobCardId: number,
    originalFileName: string,
    fileBuffer: Buffer,
    options: ThumbnailOptions = {}
  ): Promise<string> {
    try {
      // Generate thumbnail
      const thumbnailBuffer = await this.generateThumbnail(fileBuffer, options);
      
      // Generate S3 key for thumbnail
      const fileNameWithoutExt = originalFileName.split('.').slice(0, -1).join('.');
      const thumbnailKey = `job-cards/${jobCardId}/thumbs/${fileNameWithoutExt}_thumb.jpg`;
      
      // Upload to S3
      if (s3Service) {
        await s3Service.uploadFileToS3(
          thumbnailKey,
          thumbnailBuffer,
          'image/jpeg',
          { type: 'thumbnail' }
        );
        
        console.log(`Thumbnail uploaded successfully: ${thumbnailKey}`);
        return thumbnailKey;
      } else {
        throw new Error('S3 service not available');
      }
    } catch (error) {
      console.error('Error uploading thumbnail:', error);
      throw error;
    }
  }

  /**
   * Check if file is an image that can have thumbnails generated
   */
  isImageFile(mimeType: string): boolean {
    const supportedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/tiff',
      'image/bmp'
    ];
    
    return supportedTypes.includes(mimeType.toLowerCase());
  }
}

export const thumbnailService = ThumbnailService.getInstance();