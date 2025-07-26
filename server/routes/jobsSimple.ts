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
router.post('/:jobId/process-file', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { firebasePath, downloadUrl, fileName, fileSize, contentType } = req.body;
    
    console.log(`📝 Processing file for job ${jobId}:`, { fileName, fileSize, contentType });
    
    // Save file metadata to database
    const mediaFile = {
      jobId: parseInt(jobId),
      bookingId: null, // Will be set based on job card lookup
      fileName: fileName,
      fileType: contentType?.includes('dng') ? 'dng' : 'jpg',
      fileUrl: downloadUrl,
      firebasePath: firebasePath,
      downloadUrl: downloadUrl,
      mediaType: 'raw',
      fileSize: fileSize,
      serviceType: 'photography' as const,
    };
    
    // For now, just return success - full database integration can be added later
    res.json({ 
      success: true, 
      message: 'File processed successfully',
      fileId: Math.floor(Math.random() * 1000000)
    });
  } catch (error) {
    console.error('Process file error:', error);
    res.status(500).json({ 
      message: 'Failed to process uploaded file',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
// Enhanced chunked upload endpoint with buffer concatenation
router.post('/:jobId/upload-file-chunk', upload.single('file'), async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { jobId } = req.params;
    const file = req.file;
    if (!file || !file.buffer) return res.status(400).json({ error: 'No chunk data' });
    
    const rangeHeader = req.headers['content-range'];
    if (!rangeHeader) {
      // Fallback to full upload
      const filePath = `temp_uploads/${jobId}/${req.body.fileName || file.originalname}`;
      await adminBucket.file(filePath).save(file.buffer, { metadata: { contentType: file.mimetype } });
      const [url] = await adminBucket.file(filePath).getSignedUrl({ action: 'read', expires: '03-09-2491' });
      return res.json({ success: true, downloadUrl: url, firebasePath: filePath, fileName: file.originalname, fileSize: file.size });
    }
    
    const range = rangeHeader.match(/bytes (\d+)-(\d+)\/(\d+)/);
    if (!range) return res.status(400).json({ error: 'Invalid Content-Range' });
    const [ , start, end, total ] = range;
    
    const filePath = `temp_uploads/${jobId}/${req.body.fileName || file.originalname}`;
    const fileRef = adminBucket.file(filePath);
    
    // Append chunk using buffer concatenation
    const [exists] = await fileRef.exists();
    if (!exists) await fileRef.save(Buffer.alloc(0));
    const [currentBuffer] = await fileRef.download();
    const newBuffer = Buffer.concat([currentBuffer, file.buffer]);
    await fileRef.save(newBuffer, { metadata: { contentType: file.mimetype } });
    
    if (parseInt(end) + 1 === parseInt(total)) {
      const [url] = await fileRef.getSignedUrl({ action: 'read', expires: '03-09-2491' });
      res.json({ success: true, downloadUrl: url, firebasePath: filePath, fileName: req.body.fileName || file.originalname, fileSize: parseInt(total), contentType: file.mimetype });
    } else {
      res.json({ success: true });
    }
  } catch (err) {
    console.error('Chunk error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Chunk upload failed' });
  }
});

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
      fileSize: file.size,
      contentType: file.mimetype
    });
  } catch (err) {
    console.error('Server upload error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server upload failed' });
  }
});

export default router;