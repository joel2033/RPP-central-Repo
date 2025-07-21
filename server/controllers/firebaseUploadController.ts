import { Request, Response } from 'express';
import { z } from 'zod';
import { firebaseStorageService } from '../services/firebaseService.js';
import { storage } from '../storage.js';
import { thumbnailService } from '../services/thumbnailService.js';

// Validation schemas
const uploadFileSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  fileSize: z.number().positive(),
  category: z.string().optional().default('photography'),
  mediaType: z.enum(['raw', 'finished']).default('finished')
});

const processFileSchema = z.object({
  firebasePath: z.string().min(1),
  downloadUrl: z.string().min(1),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  fileSize: z.number().positive(),
  category: z.string().optional().default('photography'),
  mediaType: z.enum(['raw', 'finished']).default('finished')
});

/**
 * Upload file directly to Firebase Storage
 */
export const uploadJobFileToFirebase = async (req: Request, res: Response) => {
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
      mediaType
    );

    console.log(`✅ Generated Firebase path for ${fileName}: ${firebasePath}`);

    res.json({
      firebasePath,
      fileName,
      contentType,
      fileSize,
      mediaType,
      category,
      uploadEndpoint: '/api/jobs/' + jobCardId + '/upload-complete'
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
 * Process uploaded file after Firebase upload is complete
 */
export const processUploadedFirebaseFile = async (req: Request, res: Response) => {
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
    const validation = processFileSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: 'Invalid request data',
        errors: validation.error.errors 
      });
    }

    const { firebasePath, downloadUrl, fileName, contentType, fileSize, category, mediaType } = validation.data;

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
      fileName: fileName,
      fileType: contentType.split('/')[1] || 'unknown',
      fileUrl: downloadUrl, // Firebase download URL
      firebasePath: firebasePath,
      downloadUrl: downloadUrl,
      mediaType: mediaType,
      fileSize: fileSize,
      serviceType: category as any, // Convert category to service type
    };

    // Save to mediaFiles table
    const mediaFile = await storage.createMediaFile(mediaFileData);

    // Also create production file record for the production workflow
    const productionFileData = {
      jobCardId: jobCardId,
      fileName: fileName,
      originalName: fileName,
      firebasePath: firebasePath,
      downloadUrl: downloadUrl,
      fileSize: fileSize,
      mimeType: contentType,
      mediaType: mediaType as any,
      serviceCategory: category as any,
      uploadedBy: userId,
      metadata: {
        uploadMethod: 'firebase',
        thumbnailPath: thumbnailFirebasePath,
        thumbnailUrl: thumbnailDownloadUrl,
        originalFirebasePath: firebasePath,
        processingStatus: 'completed'
      }
    };

    const productionFile = await storage.createProductionFile(productionFileData);

    console.log(`✅ File processing complete: ${fileName}`, {
      mediaFileId: mediaFile.id,
      productionFileId: productionFile.id,
      thumbnailGenerated: !!thumbnailFirebasePath
    });

    res.json({
      success: true,
      mediaFile,
      productionFile,
      thumbnailGenerated: !!thumbnailFirebasePath,
      thumbnailUrl: thumbnailDownloadUrl,
      downloadUrl: downloadUrl
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
 * Direct file upload to Firebase (for server-side uploads)
 */
export const uploadFileDirectlyToFirebase = async (req: Request, res: Response) => {
  try {
    const jobCardId = parseInt(req.params.id);
    const userId = req.user?.claims?.sub || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!firebaseStorageService) {
      return res.status(500).json({ message: 'Firebase Storage not configured' });
    }

    // Handle multipart form data for file upload
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const file = req.file;
    const { mediaType = 'finished', category = 'photography' } = req.body;

    console.log(`🚀 Direct upload to Firebase: ${file.originalname} (${file.size} bytes)`);

    // Upload file to Firebase
    const uploadResult = await firebaseStorageService.uploadFile(
      jobCardId,
      file.originalname,
      file.buffer,
      mediaType as 'raw' | 'finished',
      file.mimetype
    );

    // Process the uploaded file (same logic as processUploadedFirebaseFile)
    const processResult = await processUploadedFirebaseFile(
      {
        ...req,
        body: {
          firebasePath: uploadResult.firebasePath,
          downloadUrl: uploadResult.downloadUrl,
          fileName: file.originalname,
          contentType: file.mimetype,
          fileSize: file.size,
          category,
          mediaType
        }
      } as Request,
      res
    );

    // Response already sent by processUploadedFirebaseFile
  } catch (error) {
    console.error('❌ Error with direct Firebase upload:', error);
    res.status(500).json({ 
      message: 'Failed to upload file directly',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};