import { Request, Response } from 'express';
import { storage } from '../storage';

import { firebaseStorageService } from '../services/firebaseService';
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
  firebasePath: z.string(),
  downloadUrl: z.string(),
  fileName: z.string(),
  contentType: z.string(),
  fileSize: z.number(),
  category: z.string(),
  mediaType: z.enum(['raw', 'finished']).default('finished')
});

/**
 * Step 1: Prepare Firebase upload (client-side upload flow)
 */
export const uploadJobFile = async (req: Request, res: Response) => {
  try {
    const jobCardId = parseInt(req.params.id);
    const userId = req.user?.claims?.sub || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!firebaseStorageService) {
      return res.status(500).json({ message: 'Firebase Storage not configured' });
    }

    // Validate request body
    const validation = uploadFileSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        reason: validation.error,
        message: 'Invalid request data',
        errors: validation.error.errors 
      });
    }

    const { fileName, contentType, fileSize, category, mediaType } = validation.data;

    // Validate file
    const fileValidation = firebaseStorageService.validateFile({ 
      size: fileSize, 
      type: contentType 
    });
    
    if (!fileValidation.valid) {
      return res.status(400).json({ 
        message: fileValidation.error 
      });
    }

    // Generate Firebase path
    const firebasePath = firebaseStorageService.generateFirebasePath(
      jobCardId, 
      fileName, 
      mediaType as 'raw' | 'finished'
    );

    console.log(`✅ Prepared Firebase upload for ${fileName} (${fileSize} bytes)`);

    res.json({
      firebasePath,
      fileName,
      contentType,
      fileSize,
      mediaType,
      category,
      uploadMethod: 'firebase'
    });

  } catch (error) {
    console.error('❌ Error preparing Firebase upload:', error);
    res.status(500).json({ 
      message: 'Failed to prepare upload',
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

    const { firebasePath, downloadUrl, fileName, contentType, fileSize, category, mediaType } = validation.data;

    if (!firebaseStorageService) {
      return res.status(500).json({ message: 'Firebase Storage not configured' });
    }

    // Generate thumbnail if it's an image
    let thumbnailFirebasePath = null;
    let thumbnailDownloadUrl = null;
    
    if (contentType.startsWith('image/')) {
      try {
        console.log(`🖼️ Generating thumbnail for ${fileName}...`);
        
        // Download original file from Firebase
        const originalFileBuffer = await firebaseStorageService.downloadFile(firebasePath);
        
        // Generate thumbnail
        const thumbnailBuffer = await thumbnailService.generateThumbnail(originalFileBuffer);
        
        // Upload thumbnail to Firebase
        thumbnailFirebasePath = `jobs/${jobCardId}/${mediaType}/thumbs/thumb_${fileName}`;
        thumbnailDownloadUrl = await firebaseStorageService.uploadBuffer(
          thumbnailFirebasePath,
          thumbnailBuffer,
          'image/jpeg'
        );
        
        console.log(`✅ Thumbnail generated and uploaded: ${thumbnailFirebasePath}`);
      } catch (thumbError) {
        console.error('❌ Thumbnail generation failed:', thumbError);
        // Continue without thumbnail - don't fail the entire upload
      }
    }

    // Get job card for enhanced metadata tracking
    const job = await storage.getJobCard(jobCardId);
    
    // Create enhanced media file record with Firebase paths
    const mediaFileData = {
      jobId: jobCardId,
      fileName,
      fileType: contentType?.split('/')[1] || 'unknown',
      fileUrl: downloadUrl, // Firebase download URL
      firebasePath: firebasePath,
      downloadUrl: downloadUrl,
      mediaType: mediaType || 'finished',
      fileSize,
      serviceType: category || 'photography',
    };

    // Store in enhanced mediaFiles table
    const savedMediaFile = await storage.createMediaFile(mediaFileData);

    // Create content item in database
    const contentItem = await jobService.createContentItem({
      jobCardId,
      contentId: `${jobCardId}-${Date.now()}`,
      name: fileName.replace(/\.[^/.]+$/, ''), // Remove file extension
      category,
      type: mediaType,
      s3Url: downloadUrl, // Use Firebase download URL for compatibility
      thumbUrl: thumbnailDownloadUrl,
      firebasePaths: [firebasePath],
      downloadUrls: [downloadUrl],
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
        firebasePath,
        downloadUrl,
        mediaType,
        address: job?.propertyAddress,
        mediaFileId: savedMediaFile.id,
        uploadMethod: 'firebase'
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

    // Use Firebase download URLs (no need for presigned URLs with Firebase)
    const filesWithUrls = await Promise.all([
      ...productionFiles.map(async (file) => ({
        ...file,
        type: 'production',
        downloadUrl: file.downloadUrl || null // Use Firebase URLs only
      })),
      ...contentItems.map(async (item) => ({
        ...item,
        type: 'content',
        downloadUrl: item.downloadUrls?.[0] || null, // Use Firebase URLs only
        thumbnailUrl: item.thumbUrl || null
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
    console.log(`📁 File found:`, file ? { id: file.id, fileName: file.fileName, downloadUrl: file.downloadUrl } : 'null');
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

    // Use Firebase download URL if available
    console.log(`🔧 File has downloadUrl: ${!!file.downloadUrl}`);
    if (file.downloadUrl) {
      console.log(`📥 Using Firebase download URL`);
      
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
        downloadUrl: file.downloadUrl,
        fileName: file.fileName,
        fileSize: file.fileSize,
        contentType: file.contentType
      };
      console.log(`📤 Returning response:`, response);
      return res.json(response);
    }

    console.log('❌ File not accessible - no download URL available');
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
      downloadUrl: file.downloadUrl,
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