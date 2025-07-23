import { Router } from 'express';
import multer from 'multer';
import { adminBucket } from '../utils/firebaseAdmin';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB
  }
});

router.post('/:jobId/upload', (req, res) => res.json({ firebasePath: `temp_uploads/${req.params.jobId}/${req.body.fileName}` }));
router.post('/:jobId/process-file', (req, res) => res.json({ success: true }));
router.post('/:jobId/upload-file', upload.single('file'), async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  console.log('🔧 REAL SERVER UPLOAD - Using Firebase Admin bucket.upload()');
  try {
    const { jobId } = req.params;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file provided' });
    
    const filePath = `temp_uploads/${jobId}/${file.originalname}`;
    console.log(`📤 Uploading to Firebase Admin: ${filePath} (${file.size} bytes)`);
    
    // Use the correct method: bucket.file().save() instead of bucket.upload()
    const firebaseFile = adminBucket.file(filePath);
    await firebaseFile.save(file.buffer, { 
      metadata: { 
        contentType: file.mimetype,
        metadata: {
          jobId: jobId,
          uploadMethod: 'server-admin'
        }
      } 
    });
    
    const [url] = await firebaseFile.getSignedUrl({ 
      action: 'read', 
      expires: '03-09-2491' 
    });
    
    console.log(`✅ Server upload successful: ${file.originalname}`);
    res.json({ 
      success: true, 
      downloadUrl: url,
      firebasePath: filePath,
      fileName: file.originalname,
      fileSize: file.size
    });
  } catch (err) {
    console.error('Server upload error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server upload failed' });
  }
});

export default router;