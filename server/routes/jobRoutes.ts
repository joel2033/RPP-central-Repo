import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../utils/validation';
import { isAuthenticated } from '../replitAuth';
import { z } from 'zod';
import multer from 'multer';
import { firebaseStorageService } from '../services/firebaseService';
import { storage } from '../storage';
import {
  getJobs,
  getJob,
  updateJobStatus,
  getJobFiles,
  getJobActivity,
  uploadJobFile,
  processUploadedFile,
} from '../controllers/jobController';

const router = Router();

const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a number'),
});

const jobQuerySchema = z.object({
  status: z.string().optional(),
  clientId: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  offset: z.string().regex(/^\d+$/).optional(),
});

const statusUpdateSchema = z.object({
  status: z.string().min(1, 'Status is required'),
});

const processFileSchema = z.object({
  firebasePath: z.string().min(1, 'Firebase path is required'),
  downloadUrl: z.string().url('Valid download URL is required'),
  fileName: z.string().min(1, 'File name is required'),
  contentType: z.string().min(1, 'Content type is required'),
  fileSize: z.number().positive('File size must be positive'),
  category: z.string().min(1, 'Category is required'),
  mediaType: z.enum(['raw', 'finished']).default('finished'),
});

// All routes require authentication
router.use(isAuthenticated);

// GET /api/jobs - Get all jobs with optional filters
router.get('/', validateQuery(jobQuerySchema), getJobs);

// GET /api/jobs/:id - Get specific job
router.get('/:id', validateParams(idParamSchema), getJob);

// PATCH /api/jobs/:id - Update job status
router.patch('/:id', validateParams(idParamSchema), validateBody(statusUpdateSchema), updateJobStatus);

// GET /api/jobs/:id/files - Get job files
router.get('/:id/files', validateParams(idParamSchema), getJobFiles);

// GET /api/jobs/:id/activity - Get job activity
router.get('/:id/activity', validateParams(idParamSchema), getJobActivity);

// Configure multer for multipart uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB
    fieldSize: 50 * 1024 * 1024, // 50MB for fields
  },
  fileFilter: (req, file, cb) => {
    console.log('📁 File upload filter:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype
    });
    
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/tiff',
      'image/x-adobe-dng', 'image/x-canon-cr2', 'image/x-nikon-nef',
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/avi',
      'application/zip', 'application/octet-stream'
    ];
    
    // Accept DNG files even if they come as octet-stream
    if (file.originalname.toLowerCase().endsWith('.dng') || allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      console.log('❌ File type rejected:', file.mimetype);
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  }
});

// POST /api/jobs/:id/upload-file - Direct file upload with FormData (must be before /upload route)
router.post('/:id/upload-file', upload.single('file'), async (req, res) => {
  try {
    console.log("🔥 Upload route hit");
    console.log("Request method:", req.method);
    console.log("Request body keys:", Object.keys(req.body || {}));
    console.log("Request body values:", req.body);
    console.log("req.file:", req.file ? { 
      originalname: req.file.originalname, 
      mimetype: req.file.mimetype, 
      size: req.file.size 
    } : null);

    const jobId = parseInt(req.params.id);
    const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;

    if (!userId) {
      console.log('❌ No user ID found');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "Missing file",
        fileReceived: !!req.file,
        message: "No file received from client",
        body: req.body
      });
    }

    const { originalname: fileName, buffer, mimetype: contentType, size: fileSize } = req.file;
    const { category = 'photography', mediaType = 'raw' } = req.body;

    // Validate required fields
    if (!req.body.mediaType) {
      return res.status(400).json({
        error: "Missing mediaType",
        body: req.body
      });
    }

    if (!req.body.category) {
      return res.status(400).json({
        error: "Missing category", 
        body: req.body
      });
    }

    console.log(`📤 Processing upload: ${fileName} (${fileSize} bytes) for job ${jobId}`);

    // Check Firebase service
    if (!firebaseStorageService) {
      return res.status(500).json({ message: 'Failed to connect to Firebase' });
    }

    // Validate job exists
    const job = await storage.getJobCard(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Upload to Firebase Storage
    console.log('🔥 Starting Firebase upload...');
    const uploadResult = await firebaseStorageService.uploadFile(
      jobId,
      fileName,
      buffer,
      mediaType === 'finished' ? 'finished' : 'raw',
      contentType
    );

    console.log('✅ Firebase upload complete:', uploadResult);

    // Save metadata to database
    const productionFile = await storage.createProductionFile({
      jobCardId: jobId,
      fileName,
      fileSize,
      firebasePath: uploadResult.firebasePath,
      downloadUrl: uploadResult.downloadUrl,
      mediaType: mediaType === 'finished' ? 'final' : 'raw',
      uploadTimestamp: new Date(),
      uploadedBy: userId,
      contentType,
      status: 'uploaded'
    });

    console.log(`✅ File uploaded successfully: ${fileName}`);

    res.json({
      success: true,
      file: productionFile,
      firebasePath: uploadResult.firebasePath,
      downloadUrl: uploadResult.downloadUrl
    });

  } catch (error) {
    console.error("❌ Firebase upload failed:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check for specific Firebase errors
    if (errorMessage.includes('Firebase')) {
      return res.status(500).json({ 
        error: "Firebase upload failure",
        details: errorMessage 
      });
    }
    
    if (errorMessage.includes('Unsupported file type')) {
      return res.status(400).json({ 
        error: "Unsupported file type",
        details: errorMessage 
      });
    }

    return res.status(500).json({
      error: "Upload failed",
      message: errorMessage,
      details: error instanceof Error ? error.stack : error
    });
  }
});

// POST /api/jobs/:id/upload - Prepare Firebase upload (JSON endpoint)
router.post('/:id/upload', validateParams(idParamSchema), uploadJobFile);

// POST /api/jobs/:id/process-file - Process uploaded Firebase file
router.post('/:id/process-file', validateParams(idParamSchema), validateBody(processFileSchema), processUploadedFile);

export default router;