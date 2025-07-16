import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import promiseRetry from 'promise-retry';

export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
}

export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(config: S3Config) {
    // Extract region code from full region description (e.g., "Asia Pacific (Sydney) ap-southeast-2" -> "ap-southeast-2")
    const regionCode = config.region?.split(' ').pop() || config.region;
    console.log('S3Client initializing with region:', regionCode);
    
    this.s3Client = new S3Client({
      region: regionCode,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.bucketName = config.bucketName;
  }

  // Generate presigned URL for upload with retry logic
  async generatePresignedUploadUrl(
    key: string,
    contentType: string,
    tags?: Record<string, string>,
    expiresIn: number = 3600 // 1 hour
  ): Promise<string> {
    console.log(`Generating presigned URL for S3 upload:`, {
      bucket: this.bucketName,
      key,
      contentType,
      tags,
      expiresIn
    });

    return promiseRetry(async (retry, attempt) => {
      try {
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          ContentType: contentType,
          Tagging: tags ? this.formatTagging(tags) : undefined,
        });

        const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
        console.log(`✓ Successfully generated presigned URL for ${key} on attempt ${attempt}`);
        return uploadUrl;
      } catch (error: any) {
        console.error(`✗ Presigned URL attempt ${attempt} failed for ${key}:`, {
          error: error.message,
          code: error.code,
          name: error.name
        });

        // Don't retry on certain errors
        if (error.code === 'AccessDenied' || error.code === 'InvalidAccessKeyId') {
          throw new Error(`S3 Access Denied - check AWS credentials`);
        }

        if (attempt < 3) {
          console.log(`Retrying presigned URL generation for ${key} (attempt ${attempt + 1}/3)`);
          retry(error);
        } else {
          throw new Error(`Presigned URL generation failed after 3 attempts: ${error.message}`);
        }
      }
    }, {
      retries: 2,
      factor: 1.5,
      minTimeout: 500,
      maxTimeout: 3000
    });
  }

  // Upload file directly to S3 using server-side putObject with retry logic
  async uploadFileToS3(
    key: string,
    buffer: Buffer,
    contentType: string,
    tags?: Record<string, string>
  ): Promise<void> {
    console.log(`Server-side S3 upload starting:`, {
      bucket: this.bucketName,
      key,
      contentType,
      bufferSize: buffer.length,
      tags
    });

    return promiseRetry(async (retry, attempt) => {
      try {
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          Tagging: tags ? this.formatTagging(tags) : undefined,
        });

        await this.s3Client.send(command);
        console.log(`✓ Successfully uploaded ${key} to S3 on attempt ${attempt}`);
      } catch (error: any) {
        console.error(`✗ Upload attempt ${attempt} failed for ${key}:`, {
          error: error.message,
          code: error.code,
          name: error.name
        });

        // Don't retry on certain errors
        if (error.code === 'AccessDenied' || error.code === 'InvalidAccessKeyId') {
          throw new Error(`S3 Access Denied - check AWS credentials`);
        }

        if (error.code === 'EntityTooLarge') {
          throw new Error(`File too large - maximum size is 2GB`);
        }

        if (attempt < 5) {
          console.log(`Retrying upload for ${key} (attempt ${attempt + 1}/5)`);
          retry(error);
        } else {
          throw new Error(`Upload failed after 5 attempts: ${error.message}`);
        }
      }
    }, {
      retries: 4,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 10000
    });
  }

  // Format tags for S3 tagging
  private formatTagging(tags: Record<string, string>): string {
    return Object.entries(tags)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
  }

  // Generate presigned URL for download
  async generatePresignedDownloadUrl(
    key: string,
    expiresIn: number = 3600 // 1 hour
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  // Get file stream from S3 for ZIP archive creation with optimized streaming
  async getFileStream(key: string): Promise<NodeJS.ReadableStream> {
    console.log(`Fetching S3 stream for key: ${key}`);
    
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    
    if (!response.Body) {
      throw new Error(`No body in S3 response for key: ${key}`);
    }

    // Cast to ReadableStream for archiver compatibility
    const stream = response.Body as NodeJS.ReadableStream;
    
    // Add error handling to the stream
    stream.on('error', (error) => {
      console.error(`Stream error for key ${key}:`, error);
    });
    
    console.log(`Successfully created stream for key: ${key}`);
    return stream;
  }

  // Generate S3 key for file
  generateS3Key(jobCardId: number, fileName: string, mediaType: string): string {
    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `job-cards/${jobCardId}/${mediaType}/${timestamp}-${cleanFileName}`;
  }

  // Delete file from S3
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  // Validate file size and type
  validateFile(file: { size: number; type: string }): { valid: boolean; error?: string } {
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/tiff',
      'image/x-adobe-dng',
      'image/x-canon-cr2',
      'image/x-canon-crw',
      'image/x-nikon-nef',
      'image/x-sony-arw',
      'image/x-panasonic-raw',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/avi',
      'video/mov',
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
    ];

    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 2GB limit' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File type not supported' };
    }

    return { valid: true };
  }

  // Retry wrapper for S3 operations
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`S3 operation failed, retrying in ${delay}ms...`, error.message);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}

// Create S3 service instance
const createS3Service = (): S3Service | null => {
  const config = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    bucketName: process.env.S3_BUCKET,
  };

  // Check if all required environment variables are present
  if (!config.accessKeyId || !config.secretAccessKey || !config.region || !config.bucketName) {
    console.warn('S3 configuration incomplete. Missing environment variables:', {
      AWS_ACCESS_KEY_ID: !!config.accessKeyId,
      AWS_SECRET_ACCESS_KEY: !!config.secretAccessKey,
      AWS_REGION: !!config.region,
      S3_BUCKET: !!config.bucketName
    });
    return null;
  }

  console.log('S3 service initialized successfully with bucket:', config.bucketName);
  return new S3Service(config);
};

export const s3Service = createS3Service();