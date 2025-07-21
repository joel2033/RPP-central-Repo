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
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/tiff',
      'image/x-adobe-dng', 'image/x-canon-cr2', 'image/x-nikon-nef',
      'video/mp4', 'video/quicktime', 'video/x-msvideo',
      'application/zip'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  }
});

router.use(isAuthenticated);

// Server-side file upload endpoint
router.post('/jobs/:id/upload-file', upload.single('file'), async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    const userId = req.user?.claims?.sub || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const { originalname: fileName, buffer, mimetype: contentType, size: fileSize } = req.file;
    const { category = 'photography', mediaType = 'raw' } = req.body;
    
    console.log(`📤 Server-side upload: ${fileName} (${fileSize} bytes) for job ${jobId}`);
    
    // Upload to Firebase Storage
    const uploadResult = await firebaseStorageService.uploadFile(
      jobId,
      fileName,
      buffer,
      mediaType as 'raw' | 'finished',
      contentType
    );
    
    // Save metadata to database
    const productionFile = await storage.createProductionFile({
      jobCardId: jobId,
      fileName,
      fileSize,
      firebasePath: uploadResult.firebasePath,
      downloadUrl: uploadResult.downloadUrl,
      mediaType: mediaType as 'raw' | 'finished',
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
    console.error('❌ Server upload error:', error);
    res.status(500).json({
      message: 'Upload failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;