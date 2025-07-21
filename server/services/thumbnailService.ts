import sharp from 'sharp';


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
   * Generate thumbnail Firebase path
   */
  generateThumbnailPath(jobId: string, originalFileName: string): string {
    const fileNameWithoutExt = originalFileName.split('.').slice(0, -1).join('.');
    return `jobs/${jobId}/thumbs/${fileNameWithoutExt}_thumb.jpg`;
  }

  /**
   * Generate thumbnail from file buffer and return the buffer
   * Firebase upload should be handled by the caller
   */
  async createThumbnail(
    fileBuffer: Buffer,
    options: ThumbnailOptions = {}
  ): Promise<Buffer> {
    try {
      // Use the existing generateThumbnail method
      return await this.generateThumbnail(fileBuffer, options);
    } catch (error) {
      console.error('Error creating thumbnail:', error);
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