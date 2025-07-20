import { Response } from 'express';
import { z } from 'zod';
import { asyncHandler, createError } from '../utils/errorHandler';
import { jobService } from '../services/jobService';
import { ThumbnailService } from '../services/thumbnailService';
import { s3Service } from '../services/s3Service';
import type { AuthenticatedRequest } from '../middleware/roleAuth';

const idParamSchema = z.object({
  id: z.string().transform(val => parseInt(val, 10)),
});

const jobQuerySchema = z.object({
  status: z.string().optional(),
  clientId: z.string().transform(val => parseInt(val, 10)).optional(),
  limit: z.string().transform(val => parseInt(val, 10)).optional(),
  offset: z.string().transform(val => parseInt(val, 10)).optional(),
});

const statusUpdateSchema = z.object({
  status: z.string().min(1, 'Status is required'),
});

export const getJobs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const filters = jobQuerySchema.parse(req.query);
  const licenseeId = req.user.claims.sub;

  const jobs = await jobService.getAllJobs(licenseeId, filters);
  
  res.json({
    data: jobs,
    pagination: {
      total: jobs.length,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
      hasMore: false, // Could implement proper pagination
    },
  });
});

export const getJob = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const licenseeId = req.user.claims.sub;

  const job = await jobService.getJobById(id, licenseeId);
  res.json(job);
});

export const updateJobStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const { status } = statusUpdateSchema.parse(req.body);
  const licenseeId = req.user.claims.sub;

  const updatedJob = await jobService.updateJobStatus(id, status, licenseeId);
  res.json(updatedJob);
});

export const getJobFiles = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const licenseeId = req.user.claims.sub;

  const files = await jobService.getJobFiles(id, licenseeId);
  res.json(files);
});

export const getJobActivity = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const licenseeId = req.user.claims.sub;

  const activity = await jobService.getJobActivity(id, licenseeId);
  res.json(activity);
});

// Centralized S3 upload with thumbnail generation
const uploadFileSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  contentType: z.string().min(1, 'Content type is required'),
  fileSize: z.number().positive('File size must be positive'),
  category: z.string().optional(),
  mediaType: z.enum(['raw', 'finished']).default('finished'),
});

export const uploadJobFile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const licenseeId = req.user.claims.sub;
  const userId = req.user.claims.sub;
  
  // Validate input
  const fileData = uploadFileSchema.parse(req.body);
  
  if (!s3Service) {
    throw createError(500, 'S3 service not configured');
  }

  // Generate S3 key for the main file
  const s3Key = s3Service.generateS3Key(id, fileData.fileName, fileData.mediaType);
  
  // Generate presigned URL for file upload
  const uploadUrl = await s3Service.generatePresignedUploadUrl(
    s3Key,
    fileData.contentType,
    { type: fileData.mediaType },
    3600 // 1 hour expiry
  );

  // Prepare thumbnail key (will be generated after upload)
  const thumbnailService = ThumbnailService.getInstance();
  const thumbnailKey = thumbnailService.generateThumbnailKey(s3Key);

  res.json({
    uploadUrl,
    s3Key,
    thumbnailKey,
    metadata: {
      jobCardId: id,
      fileName: fileData.fileName,
      contentType: fileData.contentType,
      fileSize: fileData.fileSize,
      category: fileData.category,
      mediaType: fileData.mediaType,
    }
  });
});

// Process uploaded file and generate thumbnail
export const processUploadedFile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const licenseeId = req.user.claims.sub;
  const userId = req.user.claims.sub;
  
  const processData = z.object({
    s3Key: z.string(),
    fileName: z.string(),
    contentType: z.string(),
    fileSize: z.number(),
    category: z.string().optional(),
    mediaType: z.enum(['raw', 'finished']).default('finished'),
  }).parse(req.body);

  if (!s3Service) {
    throw createError(500, 'S3 service not configured');
  }

  let thumbnailKey: string | null = null;

  // Generate thumbnail for image files
  if (processData.contentType.startsWith('image/') && processData.mediaType === 'finished') {
    try {
      // Download the uploaded file from S3
      const fileStream = await s3Service.getFileStream(processData.s3Key);
      
      // Convert stream to buffer
      const chunks: Buffer[] = [];
      const readable = fileStream as any;
      
      for await (const chunk of readable) {
        chunks.push(chunk);
      }
      const fileBuffer = Buffer.concat(chunks);

      // Generate and upload thumbnail
      const thumbnailService = ThumbnailService.getInstance();
      thumbnailKey = await thumbnailService.uploadThumbnail(
        id,
        processData.fileName,
        fileBuffer,
        { width: 300, height: 300, quality: 85 }
      );

      console.log(`✅ Thumbnail generated for ${processData.fileName}: ${thumbnailKey}`);
    } catch (error) {
      console.warn(`⚠️ Failed to generate thumbnail for ${processData.fileName}:`, error);
      // Continue without thumbnail - not a critical error
    }
  }

  // Create content item record in database
  const contentItem = await jobService.createContentItem(id, {
    contentId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: processData.fileName,
    category: processData.category || 'general',
    type: processData.mediaType,
    uploaderRole: 'editor',
    s3Urls: [processData.s3Key],
    thumbUrl: thumbnailKey,
    fileSize: processData.fileSize,
    status: 'ready_for_qc',
    createdBy: userId,
    updatedBy: userId,
  });

  // Log activity
  await jobService.logActivity(id, userId, 
    `Uploaded ${processData.mediaType} file: ${processData.fileName}${thumbnailKey ? ' (with thumbnail)' : ''}`
  );

  res.json({
    success: true,
    contentItem,
    thumbnailGenerated: !!thumbnailKey,
  });
});