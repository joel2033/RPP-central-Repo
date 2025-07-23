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
router.get('/', validateQuery(jobQuerySchema), async (req, res) => {
  try {
    const jobs = await storage.getJobCards((req.user as any)?.claims?.sub || '');
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// GET /api/jobs/:id - Get specific job
router.get('/:id', validateParams(idParamSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const job = await storage.getJobCard(parseInt(id), (req.user as any)?.claims?.sub || '');
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// PATCH /api/jobs/:id - Update job status
router.patch('/:id', validateParams(idParamSchema), validateBody(statusUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await storage.updateJobCardStatus(parseInt(id), status, (req.user as any)?.claims?.sub || '');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update job status' });
  }
});

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

// Temporary storage for chunked uploads
const chunkStorage = new Map<string, { chunks: Buffer[], metadata: any }>();

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
      const job = await storage.getJobCard(parseInt(jobId), (req.user as any)?.claims?.sub || '');
      if (job && job.status === 'unassigned') {
        await storage.updateJobCardStatus(parseInt(jobId), 'in_progress', (req.user as any)?.claims?.sub || '');
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

// POST /api/jobs/:id/generate-signed-url - Generate signed URL for resumable upload
const signedUrlSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  contentType: z.string().min(1, 'Content type is required'),
  fileSize: z.number().positive('File size must be positive'),
});

router.post('/:id/generate-signed-url', validateParams(idParamSchema), validateBody(signedUrlSchema), async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { id: jobId } = req.params;
    const { fileName, contentType, fileSize } = req.body;
    
    console.log(`🔑 Generating resumable signed URL for ${fileName} (${fileSize} bytes) in job ${jobId}`);
    
    const { adminBucket } = await import('../utils/firebaseAdmin');
    const filePath = `temp_uploads/${jobId}/${fileName}`;
    
    // Generate resumable upload URL for chunked uploads
    const [signedUrl] = await adminBucket.file(filePath).getSignedUrl({
      action: 'resumable',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour for large files
      contentType: contentType,
      extensionHeaders: {
        'x-goog-content-length-range': `0,${fileSize}`
      }
    });
    
    console.log(`✅ Generated resumable signed URL for ${fileName}`);
    res.json({ signedUrl, filePath, fileSize, contentType });
  } catch (error) {
    console.error('❌ Failed to generate signed URL:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to generate signed URL',
      details: error instanceof Error ? error.stack : 'No stack trace available'
    });
  }
});

// POST /api/jobs/:jobId/upload-file-chunk - Handle chunked file uploads
router.post('/:jobId/upload-file-chunk', upload.single('file'), async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { jobId } = req.params;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No chunk' });
    }
    
    const fileName = req.body.fileName || req.headers['x-file-name'] as string;
    const contentRange = req.headers['content-range'] as string;
    const chunkIndex = parseInt(req.body.chunkIndex || '0');
    const totalChunks = parseInt(req.body.totalChunks || '1');
    
    console.log(`Received chunk ${chunkIndex + 1}/${totalChunks} for ${fileName} (${file.size} bytes)`);
    console.log('Content-Range header:', contentRange);
    
    if (!fileName) {
      return res.status(400).json({ error: 'File name required' });
    }
    
    const chunkKey = `${jobId}-${fileName}`;
    
    // Initialize chunk storage for this file
    if (!chunkStorage.has(chunkKey)) {
      chunkStorage.set(chunkKey, {
        chunks: new Array(totalChunks),
        metadata: {
          fileName,
          contentType: req.body.contentType || file.mimetype,
          totalChunks,
          jobId
        }
      });
    }
    
    const storage_data = chunkStorage.get(chunkKey)!;
    storage_data.chunks[chunkIndex] = file.buffer;
    
    console.log(`Stored chunk ${chunkIndex + 1}/${totalChunks} for ${fileName}`);
    
    res.json({ success: true, chunkIndex, totalChunks });
  } catch (err) {
    console.error('Chunk upload error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Chunk upload failed' });
  }
});

// POST /api/jobs/:id/finalize-chunked-upload - Combine chunks and upload to Firebase
router.post('/:id/finalize-chunked-upload', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { id: jobId } = req.params;
    const { fileName, contentType, fileSize, mediaType } = req.body;
    
    const chunkKey = `${jobId}-${fileName}`;
    const storage_data = chunkStorage.get(chunkKey);
    
    if (!storage_data) {
      return res.status(400).json({ error: 'No chunks found for this file' });
    }
    
    // Combine all chunks
    const combinedBuffer = Buffer.concat(storage_data.chunks.filter(chunk => chunk));
    console.log(`Combining ${storage_data.chunks.length} chunks into ${combinedBuffer.length} bytes for ${fileName}`);
    
    // Upload to Firebase
    const { adminBucket } = await import('../utils/firebaseAdmin');
    const firebasePath = `temp_uploads/${jobId}/${fileName}`;
    const firebaseFile = adminBucket.file(firebasePath);
    
    await firebaseFile.save(combinedBuffer, {
      metadata: {
        contentType: contentType,
        metadata: {
          jobId: jobId,
          category: 'photography',
          mediaType: mediaType || 'raw'
        }
      }
    });
    
    // Generate download URL
    const [downloadUrl] = await firebaseFile.getSignedUrl({
      action: 'read',
      expires: '03-09-2491'
    });
    
    // Clean up chunk storage
    chunkStorage.delete(chunkKey);
    
    console.log(`Successfully uploaded chunked file ${fileName} to Firebase`);
    
    res.json({
      success: true,
      downloadUrl,
      firebasePath,
      fileName,
      fileSize: combinedBuffer.length,
      contentType
    });
  } catch (error) {
    console.error('Finalize chunked upload error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to finalize chunked upload' 
    });
  }
});

export default router;