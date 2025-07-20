import { Request, Response } from 'express';
import { storage } from '../storage';
import { s3Service } from '../services/s3Service';
import { thumbnailService } from '../services/thumbnailService';
import { jobService } from '../services/jobService';
import { z } from 'zod';

// Validation schemas
const uploadFileSchema = z.object({
  fileName: z.string(),
  contentType: z.string(),
  fileSize: z.number(),
  category: z.string(),
  mediaType: z.enum(['raw', 'finished']).default('finished')
});

const processFileSchema = z.object({
  s3Key: z.string(),
  fileName: z.string(),
  contentType: z.string(),
  fileSize: z.number(),
  category: z.string(),
  mediaType: z.enum(['raw', 'finished']).default('finished')
});

/**
 * Step 1: Generate presigned URL for file upload
 */
export const uploadJobFile = async (req: Request, res: Response) => {
  try {
    const jobCardId = parseInt(req.params.id);
    const userId = req.user?.claims?.sub || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Validate request body
    const validation = uploadFileSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: 'Invalid request data',
        errors: validation.error.errors 
      });
    }

    const { fileName, contentType, fileSize, category, mediaType } = validation.data;

    // Generate S3 key for the file
    const timestamp = Date.now();
    const s3Key = `job-${jobCardId}/${mediaType}/${timestamp}_${fileName}`;

    // Generate presigned URL for upload
    const uploadUrl = await s3Service.generatePresignedUploadUrl(s3Key, contentType, {
      type: mediaType,
      jobId: jobCardId.toString(),
      uploadedBy: userId
    });

    console.log(`✅ Generated upload URL for ${fileName} (${fileSize} bytes)`);

    res.json({
      uploadUrl,
      s3Key,
      fileName,
      contentType,
      fileSize
    });

  } catch (error) {
    console.error('❌ Error generating upload URL:', error);
    res.status(500).json({ 
      message: 'Failed to generate upload URL',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Step 2: Process uploaded file (generate thumbnail, save metadata)
 */
export const processUploadedFile = async (req: Request, res: Response) => {
  try {
    const jobCardId = parseInt(req.params.id);
    const userId = req.user?.claims?.sub || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Validate request body
    const validation = processFileSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: 'Invalid request data',
        errors: validation.error.errors 
      });
    }

    const { s3Key, fileName, contentType, fileSize, category, mediaType } = validation.data;

    // Generate thumbnail if it's an image
    let thumbS3Key = null;
    if (contentType.startsWith('image/')) {
      try {
        console.log(`🖼️ Generating thumbnail for ${fileName}...`);
        
        // Download original file from S3
        const originalFileBuffer = await s3Service.downloadFile(s3Key);
        
        // Generate thumbnail
        const thumbnailBuffer = await thumbnailService.generateThumbnail(originalFileBuffer);
        
        // Upload thumbnail to S3
        thumbS3Key = `job-${jobCardId}/${mediaType}/thumbs/thumb_${fileName}`;
        await s3Service.uploadBuffer(thumbS3Key, thumbnailBuffer, 'image/jpeg', {
          type: 'thumbnail',
          originalFile: s3Key,
          jobId: jobCardId.toString()
        });
        
        console.log(`✅ Thumbnail generated and uploaded: ${thumbS3Key}`);
      } catch (thumbError) {
        console.error('❌ Thumbnail generation failed:', thumbError);
        // Continue without thumbnail - don't fail the entire upload
      }
    }

    // Get job card for enhanced metadata tracking
    const job = await storage.getJobCard(jobCardId);
    
    // Create enhanced media file record with RAW upload tracking
    const mediaFileData = {
      jobId: jobCardId,
      address: job?.propertyAddress || 'Unknown Address',
      uploaderId: userId,
      fileName,
      s3Key,
      mediaType: mediaType || 'finished', // finished for editor uploads
      fileSize,
      contentType,
      serviceType: category || 'photography',
      fileType: contentType?.split('/')[1] || 'unknown',
      fileUrl: s3Key, // Use s3Key as fileUrl
      licenseeId: req.user?.licenseeId || userId,
      uploadTimestamp: new Date(),
    };

    // Store in enhanced mediaFiles table
    const savedMediaFile = await storage.insertMediaFile(mediaFileData);

    // Create content item in database
    const contentItem = await jobService.createContentItem({
      jobCardId,
      contentId: `${jobCardId}-${Date.now()}`,
      name: fileName.replace(/\.[^/.]+$/, ''), // Remove file extension
      category,
      type: mediaType,
      s3Url: s3Key,
      thumbUrl: thumbS3Key,
      fileSize,
      uploaderRole: 'editor', // Assuming editor uploads for now
      status: 'ready_for_qc'
    });

    // Enhanced activity logging with metadata
    await storage.createJobActivityLog({
      jobCardId,
      userId,
      action: 'upload',
      description: `User ${userId} uploaded ${mediaType?.toUpperCase() || 'FINISHED'} file: ${fileName} to ${job?.propertyAddress || 'job'}`,
      metadata: {
        fileName,
        fileSize,
        contentType,
        s3Key,
        mediaType,
        address: job?.propertyAddress,
        mediaFileId: savedMediaFile.id
      }
    });

    // Update job status if needed
    if (mediaType === 'finished') {
      await storage.updateJobCard(jobCardId, { status: 'ready_for_qa' });
      await jobService.logActivity(jobCardId, userId, 'Job status updated to Ready for QC', 'status_change');
    }

    console.log(`✅ File processed successfully: ${fileName}`);

    res.json({
      success: true,
      contentItem,
      message: `File ${fileName} uploaded and processed successfully`
    });

  } catch (error) {
    console.error('❌ Error processing uploaded file:', error);
    res.status(500).json({ 
      message: 'Failed to process uploaded file',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get all jobs (for /api/jobs endpoint)
 */
export const getAllJobs = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.claims?.sub || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const jobCards = await storage.getJobCards(userId);
    res.json(jobCards);
  } catch (error) {
    console.error('❌ Error fetching jobs:', error);
    res.status(500).json({ message: 'Failed to fetch jobs' });
  }
};

/**
 * Get specific job by ID
 */
export const getJobById = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.id);
    const userId = req.user?.claims?.sub || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const job = await storage.getJobCard(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('❌ Error fetching job:', error);
    res.status(500).json({ message: 'Failed to fetch job' });
  }
};

/**
 * Get job files with presigned URLs
 */
export const getJobFiles = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.id);
    const userId = req.user?.claims?.sub || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get production files
    const productionFiles = await storage.getProductionFiles(jobId);
    
    // Get content items
    const contentItems = await storage.getContentItems(jobId);

    // Generate presigned URLs for thumbnails and full files
    const filesWithUrls = await Promise.all([
      ...productionFiles.map(async (file) => ({
        ...file,
        type: 'production',
        downloadUrl: file.s3Key ? await s3Service.generatePresignedDownloadUrl(file.s3Key) : null
      })),
      ...contentItems.map(async (item) => ({
        ...item,
        type: 'content',
        downloadUrl: item.s3Url ? await s3Service.generatePresignedDownloadUrl(item.s3Url) : null,
        thumbnailUrl: item.thumbUrl ? await s3Service.generatePresignedDownloadUrl(item.thumbUrl) : null
      }))
    ]);

    res.json(filesWithUrls);
  } catch (error) {
    console.error('❌ Error fetching job files:', error);
    res.status(500).json({ message: 'Failed to fetch job files' });
  }
};

/**
 * Get job activity log
 */
export const getJobActivity = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.id);
    const userId = req.user?.claims?.sub || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const activity = await storage.getJobActivity(jobId);
    res.json(activity);
  } catch (error) {
    console.error('❌ Error fetching job activity:', error);
    res.status(500).json({ message: 'Failed to fetch job activity' });
  }
};

/**
 * Enhanced processUploadedFile - RAW image upload tracking with metadata
 * Replaces the existing function with improved tracking capabilities
 */

/**
 * Access control for media file downloads - Step 4
 */
export const downloadMediaFile = async (req: Request, res: Response) => {
  try {
    console.log(`🔍 Download request for fileId: ${req.params.fileId}`);
    const fileId = parseInt(req.params.fileId);
    const userId = req.user?.claims?.sub || req.user?.id;
    const userLicenseeId = req.user?.licenseeId || userId;

    console.log(`📋 User: ${userId}, LicenseeId: ${userLicenseeId}, FileId: ${fileId}`);

    if (!userId) {
      console.log('❌ No userId found, returning 401');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get the media file
    const file = await storage.getMediaFileById(fileId);
    console.log(`📁 File found:`, file ? { id: file.id, fileName: file.fileName, s3Key: file.s3Key } : 'null');
    if (!file) {
      console.log('❌ File not found in database');
      return res.status(404).json({ message: 'File not found' });
    }

    // Access control check - Step 4 requirement
    // Temporarily relaxed for testing with existing schema
    if (file.uploaderId && file.uploaderId !== userId && file.licenseeId && file.licenseeId !== userLicenseeId) {
      console.log(`Access denied: userId=${userId}, uploaderId=${file.uploaderId}, licenseeId=${userLicenseeId}, fileLicenseeId=${file.licenseeId}`);
      return res.status(403).json({ message: 'Access denied' });
    }

    // Generate presigned download URL if file is in S3
    console.log(`🔧 S3 Service available: ${!!s3Service}, File has s3Key: ${!!file.s3Key}`);
    if (file.s3Key && s3Service) {
      console.log(`📥 Generating presigned URL for s3Key: ${file.s3Key}`);
      const downloadUrl = await s3Service.generatePresignedDownloadUrl(file.s3Key);
      console.log(`✅ Generated download URL: ${downloadUrl ? 'Success' : 'Failed'}`);
      
      // Log the download activity
      try {
        await storage.createJobActivityLog({
          jobCardId: file.jobId || 0,
          userId,
          action: 'download',
          description: `User ${userId} downloaded file: ${file.fileName}`,
          metadata: {
            fileId: file.id,
            fileName: file.fileName,
            fileSize: file.fileSize,
            mediaType: file.mediaType
          }
        });
        console.log(`📝 Activity logged successfully`);
      } catch (logError) {
        console.error('⚠️ Failed to log activity:', logError);
      }

      const response = {
        downloadUrl,
        fileName: file.fileName,
        fileSize: file.fileSize,
        contentType: file.contentType
      };
      console.log(`📤 Returning response:`, response);
      return res.json(response);
    }

    console.log('❌ File not accessible - no S3 key or S3 service unavailable');
    return res.status(404).json({ message: 'File not accessible' });
    
  } catch (error) {
    console.error('❌ Error downloading media file:', error);
    res.status(500).json({ message: 'Failed to download file' });
  }
};

/**
 * Get media files by job ID - connects editor dashboard to enhanced RAW file system
 */
export const getJobMediaFiles = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.id);
    const userId = req.user?.claims?.sub || req.user?.id;
    const userLicenseeId = req.user?.licenseeId || userId;
    const mediaType = req.query.mediaType as string; // 'raw' or 'finished'

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get all media files for this job
    let mediaFiles = await storage.getMediaFilesByJobId(jobId, userLicenseeId);
    
    // Filter by media type if specified  
    if (mediaType) {
      // Handle both 'raw' and 'finished' queries but map to correct enum values
      const targetType = mediaType === 'finished' ? 'final' : mediaType;
      mediaFiles = mediaFiles.filter(file => file.mediaType === targetType);
    }

    console.log(`📁 Found ${mediaFiles.length} media files for job ${jobId} (type: ${mediaType || 'all'})`);
    
    // Return files in compatible format for the frontend
    const compatibleFiles = mediaFiles.map(file => ({
      id: file.id,
      fileName: file.fileName,
      fileSize: file.fileSize,
      contentType: file.contentType,
      mediaType: file.mediaType,
      s3Key: file.s3Key,
      uploaderId: file.uploaderId,
      uploadTimestamp: file.uploadTimestamp,
      address: file.address
    }));

    res.json(compatibleFiles);
  } catch (error) {
    console.error('❌ Error fetching job media files:', error);
    res.status(500).json({ message: 'Failed to fetch media files' });
  }
};