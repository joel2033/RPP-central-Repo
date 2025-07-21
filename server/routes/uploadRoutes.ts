import { Router } from 'express';
import multer from 'multer';
import { isAuthenticated } from '../replitAuth';
import { firebaseStorageService } from '../services/firebaseService';
import { storage } from '../storage';

const router = Router();

// Configure multer for file uploads (2GB limit)
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

router.use(isAuthenticated);

// Server-side file upload endpoint
router.post('/jobs/:id/upload-file', async (req, res) => {
  console.log('🔍 === UPLOAD REQUEST DEBUG START ===');
  console.log('🔍 Method:', req.method);
  console.log('🔍 URL:', req.url);
  console.log('🔍 Headers:', {
    'content-type': req.headers['content-type'],
    'content-length': req.headers['content-length'],
    'authorization': req.headers['authorization'] ? 'Present' : 'Missing',
    'cookie': req.headers['cookie'] ? 'Present' : 'Missing'
  });
  console.log('🔍 Raw body type:', typeof req.body);
  console.log('🔍 Raw body keys:', req.body ? Object.keys(req.body) : 'No body');
  console.log('🔍 Files in req:', req.file ? 'req.file present' : 'req.file missing');
  console.log('🔍 Files array:', (req as any).files ? 'req.files present' : 'req.files missing');
  
  // Apply multer middleware manually
  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.log('❌ Multer error:', err);
      return res.status(400).json({
        message: 'File upload error',
        error: err.message,
        code: err.code || 'UPLOAD_ERROR'
      });
    }
    
    console.log('✅ Multer processed successfully');
    console.log('📤 After multer - file:', req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'Still no file');
    console.log('📤 After multer - body:', req.body);
    
  try {
    
    const jobId = parseInt(req.params.id);
    const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
    
    if (!userId) {
      console.log('❌ No user ID found');
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    if (!req.file) {
      console.log('❌ No file in request after multer processing');
      return res.status(400).json({ 
        message: 'No file uploaded',
        debug: {
          bodyKeys: req.body ? Object.keys(req.body) : [],
          contentType: req.headers['content-type'],
          hasFile: !!req.file,
          hasFiles: !!(req as any).files
        }
      });
    }
    
    const { originalname: fileName, buffer, mimetype: contentType, size: fileSize } = req.file;
    const { category = 'photography', mediaType = 'raw' } = req.body;
    
    // Validate required fields
    if (!category) {
      return res.status(400).json({ 
        message: 'Missing category field',
        received: { body: req.body }
      });
    }
    
    if (!mediaType) {
      return res.status(400).json({ 
        message: 'Missing mediaType field',
        received: { body: req.body }
      });
    }
    
    console.log(`📤 Processing upload: ${fileName} (${fileSize} bytes) for job ${jobId}`);
    console.log(`📤 Upload details:`, { category, mediaType, contentType, userId });
    
    // Validate job exists
    const job = await storage.getJobCard(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    // Check Firebase service availability
    if (!firebaseStorageService) {
      return res.status(500).json({ message: 'Firebase Storage not configured' });
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
    
    console.log(`✅ Database record created: ${fileName}`);
    
    res.json({
      success: true,
      file: productionFile,
      firebasePath: uploadResult.firebasePath,
      downloadUrl: uploadResult.downloadUrl
    });
    
  } catch (error) {
    console.error('❌ Server upload error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
    res.status(500).json({
      message: 'Upload failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    });
  }
  }); // Close multer callback
});

export default router;