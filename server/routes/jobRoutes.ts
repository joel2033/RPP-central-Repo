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
  console.log('📥 /upload-file route hit');
  console.log('Request body:', req.body);
  console.log('Req body keys:', Object.keys(req.body));
  console.log('Req body types:', Object.entries(req.body).map(([key, val]) => ({key, type: typeof val, value: val})));
  console.log('File:', req.file ? { name: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype } : 'No file');
  
  try {
    const { id: jobId } = req.params;
    const file = req.file;
    
    if (!file) throw new Error('No file provided');
    
    // Extract values from FormData (all come as strings)
    const fileName = req.body.fileName || file.originalname;
    const contentType = req.body.contentType || file.mimetype;
    const fileSize = req.body.fileSize ? parseInt(req.body.fileSize) : file.size;
    const category = req.body.category || 'photography';
    const mediaType = req.body.mediaType || 'raw';
    
    console.log('Extracted values:', { fileName, contentType, fileSize, category, mediaType });
    
    // Create request body for validation
    const requestBody = { fileName, contentType, fileSize, category, mediaType };
    
    // Validate request body with Zod
    const parsedBody = uploadFormDataSchema.parse(requestBody);
    console.log('✅ Validation passed:', parsedBody);
    
    // Import Firebase Admin
    const { adminBucket } = await import('../utils/firebaseAdmin');
    
    // Use temp_uploads path as specified in requirements
    const firebasePath = `temp_uploads/${jobId}/${parsedBody.fileName}`;
    const firebaseFile = adminBucket.file(firebasePath);
    
    // Upload file to Firebase Storage
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
      firebasePath: firebasePath, 
      downloadUrl 
    });
  } catch (error) {
    console.error('Upload error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Validation failed', 
        message: 'Invalid request data', 
        reason: JSON.stringify(error.issues),
        issues: error.issues 
      });
    } else {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
});

// POST /api/jobs/:id/upload - Prepare Firebase upload (JSON endpoint)
router.post('/:id/upload', validateParams(idParamSchema), uploadJobFile);

// POST /api/jobs/:id/process-file - Process uploaded Firebase file
router.post('/:id/process-file', validateParams(idParamSchema), validateBody(processFileSchema), processUploadedFile);

// POST /api/jobs/:id/generate-signed-url - Generate signed URL for direct upload
const signedUrlSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
});

router.post('/:id/generate-signed-url', validateParams(idParamSchema), validateBody(signedUrlSchema), async (req, res) => {
  try {
    const { id: jobId } = req.params;
    const { fileName } = req.body;
    
    console.log(`🔑 Generating signed URL for ${fileName} in job ${jobId}`);
    
    const admin = require('../utils/firebaseAdmin');
    const bucket = admin.storage().bucket();
    const filePath = `temp_uploads/${jobId}/${fileName}`;
    
    const [signedUrl] = await bucket.file(filePath).getSignedUrl({
      action: 'write',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
      contentType: 'application/octet-stream',
    });
    
    console.log(`✅ Generated signed URL for ${fileName}`);
    res.json({ signedUrl, filePath });
  } catch (error) {
    console.error('❌ Failed to generate signed URL:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;