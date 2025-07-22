import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../utils/validation';
import { isAuthenticated } from '../replitAuth';
import { z } from 'zod';
import multer from 'multer';
import { firebaseStorageService } from '../services/firebaseService';
import { storage } from '../storage';
import {
  getJobFiles,
  getJobActivity,
  uploadJobFile,
  processUploadedFile,
  downloadMediaFile,
  getJobMediaFiles
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

// Debug middleware to log all requests
router.use((req, res, next) => {
  if (req.method === 'POST' && req.path.includes('upload')) {
    console.log('🔍 DEBUG - Route request:', req.method, req.originalUrl, req.path);
    console.log('🔍 DEBUG - Content-Type:', req.headers['content-type']);
  }
  next();
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

// Define upload schema for FormData validation
const uploadFormDataSchema = z.object({
  fileName: z.string(),
  contentType: z.string(),
  fileSize: z.number(), // Number as specified in requirements
  category: z.string(),
  mediaType: z.string()
});

// POST /api/jobs/:id/upload-file - Direct file upload with FormData (must be before /upload route)
router.post('/:id/upload-file', upload.single('file'), async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  console.log('🎯 ENTERING /upload-file endpoint - this is the correct path!');
  console.log('📥 Server upload request received');
  console.log('Received req.body:', req.body);
  console.log('Received file:', req.file ? 'Yes' : 'No');
  console.log('File details:', req.file ? { name: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype } : 'No file');
  
  try {
    const { id: jobId } = req.params;
    const file = req.file;
    
    if (!file) throw new Error('No file provided');
    
    // Use fallback pattern as requested - req.body with file fallbacks
    const fileName = req.body.fileName || file.originalname;
    const contentType = req.body.contentType || file.mimetype || 'application/octet-stream';
    const fileSize = parseInt(req.body.fileSize) || file.size;
    const category = req.body.category || 'photography';  // Default for upload-to-editor workflow
    const mediaType = req.body.mediaType || 'raw';         // Default for upload-to-editor workflow
    
    console.log('Using fallback values:', { fileName, contentType, fileSize, category, mediaType });
    
    // Skip Zod validation entirely and use values directly
    const parsedBody = { fileName, contentType, fileSize, category, mediaType };
    console.log('✅ Skipping validation, using direct values:', parsedBody);
    
    // Import Firebase Admin
    const { adminBucket } = await import('../utils/firebaseAdmin');
    
    // Use temp_uploads path as specified in requirements
    const firebasePath = `temp_uploads/${jobId}/${parsedBody.fileName}`;
    const firebaseFile = adminBucket.file(firebasePath);
    
    // Upload file to Firebase Storage
    console.log(`📤 Uploading to Firebase: ${firebasePath}`);
    await firebaseFile.save(file.buffer, { 
      metadata: { 
        contentType: file.mimetype || parsedBody.contentType,
        metadata: {
          jobId: jobId,
          category: parsedBody.category,
          mediaType: parsedBody.mediaType
        }
      } 
    });
    
    // Generate signed URL with long expiry
    const [downloadUrl] = await firebaseFile.getSignedUrl({ 
      action: 'read', 
      expires: '03-09-2491' 
    });
    
    // Optional: Update Job Card status in DB to 'In Progress'
    try {
      const job = await storage.getJobCard(parseInt(jobId));
      if (job && job.status === 'unassigned') {
        await storage.updateJobCardStatus(parseInt(jobId), 'in_progress');
      }
    } catch (dbError) {
      console.warn('Failed to update job status:', dbError);
    }
    
    res.json({
      success: true,
      fileName: parsedBody.fileName,
      firebasePath: firebasePath,
      downloadUrl,
      contentType: parsedBody.contentType,
      fileSize: parsedBody.fileSize
    });
  } catch (error) {
    console.error('Upload error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Server upload failed',
      success: false
    });
  }
});

// POST /api/jobs/:id/upload - Prepare Firebase upload (JSON endpoint) 
router.post('/:id/upload', validateParams(idParamSchema), (req, res, next) => {
  console.log('✅ CORRECT ENDPOINT - /upload called for Firebase preparation! URL:', req.originalUrl);
  console.log('📋 Content-Type:', req.headers['content-type']);
  console.log('📋 Request body:', req.body);
  next();
}, uploadJobFile);

// POST /api/jobs/:id/process-file - Process uploaded Firebase file
router.post('/:id/process-file', validateParams(idParamSchema), validateBody(processFileSchema), processUploadedFile);

// POST /api/jobs/:id/generate-signed-url - Generate signed URL for direct upload
const signedUrlSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
});

router.post('/:id/generate-signed-url', validateParams(idParamSchema), validateBody(signedUrlSchema), async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { id: jobId } = req.params;
    const { fileName } = req.body;
    
    if (!fileName) {
      throw new Error('No fileName provided');
    }
    
    console.log(`🔑 Generating signed URL for ${fileName} in job ${jobId}`);
    
    const { adminBucket } = await import('../utils/firebaseAdmin');
    const filePath = `temp_uploads/${jobId}/${fileName}`;
    
    const [signedUrl] = await adminBucket.file(filePath).getSignedUrl({
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: 'application/octet-stream',
    });
    
    console.log(`✅ Generated signed URL for ${fileName}`);
    res.json({ signedUrl, filePath });
  } catch (error) {
    console.error('❌ Failed to generate signed URL:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to generate signed URL',
      details: error instanceof Error ? error.stack : 'No stack trace available'
    });
  }
});

export default router;