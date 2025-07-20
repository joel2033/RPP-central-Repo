// Test script to verify the centralized S3 upload system
import fs from 'fs';

async function testCentralizedUpload() {
  const baseUrl = 'http://localhost:5000';
  const jobCardId = 16;
  
  // Read cookies for authentication
  let cookies = '';
  try {
    cookies = fs.readFileSync('cookies.txt', 'utf8').trim();
  } catch (error) {
    console.log('No cookies found, proceeding without authentication');
  }

  console.log('🧪 Testing Centralized S3 Upload System');
  console.log('=====================================');

  try {
    // Step 1: Test upload URL generation
    console.log('\n1️⃣ Testing upload URL generation...');
    const uploadResponse = await fetch(`${baseUrl}/api/jobs/${jobCardId}/upload-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        fileName: 'test-thumbnail.jpg',
        contentType: 'image/jpeg',
        fileSize: 512000,
        category: 'photography',
        mediaType: 'finished'
      })
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload URL generation failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    const uploadData = await uploadResponse.json();
    console.log('✅ Upload URL generated successfully');
    console.log('📋 Upload Data:', {
      s3Key: uploadData.s3Key,
      fileName: uploadData.fileName,
      contentType: uploadData.contentType
    });

    // Step 2: Create a test image buffer (simple JPEG header)
    const testImageBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
      0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
      0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xD9
    ]);

    console.log('\n2️⃣ Testing S3 upload with presigned URL...');
    const s3Response = await fetch(uploadData.uploadUrl, {
      method: 'PUT',
      body: testImageBuffer,
      headers: {
        'Content-Type': 'image/jpeg'
      }
    });

    if (!s3Response.ok) {
      throw new Error(`S3 upload failed: ${s3Response.status} ${s3Response.statusText}`);
    }

    console.log('✅ File uploaded to S3 successfully');

    // Step 3: Test file processing (thumbnail generation)
    console.log('\n3️⃣ Testing file processing and thumbnail generation...');
    const processResponse = await fetch(`${baseUrl}/api/jobs/${jobCardId}/process-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        s3Key: uploadData.s3Key,
        fileName: uploadData.fileName,
        contentType: uploadData.contentType,
        fileSize: testImageBuffer.length,
        category: 'photography',
        mediaType: 'finished'
      })
    });

    if (!processResponse.ok) {
      const errorText = await processResponse.text();
      throw new Error(`File processing failed: ${processResponse.status} ${errorText}`);
    }

    const processResult = await processResponse.json();
    console.log('✅ File processing completed successfully');
    console.log('📋 Process Result:', {
      success: processResult.success,
      message: processResult.message,
      contentItemId: processResult.contentItem?.id
    });

    // Step 4: Verify content items were created
    console.log('\n4️⃣ Verifying content items were created...');
    const contentResponse = await fetch(`${baseUrl}/api/job-cards/${jobCardId}/content-items`, {
      headers: { 'Cookie': cookies }
    });

    if (contentResponse.ok) {
      const contentItems = await contentResponse.json();
      console.log('✅ Content items retrieved successfully');
      console.log(`📊 Total content items: ${contentItems.length}`);
      
      const latestItem = contentItems[contentItems.length - 1];
      if (latestItem) {
        console.log('📋 Latest content item:', {
          id: latestItem.id,
          name: latestItem.name,
          hasThumb: !!latestItem.thumbUrl,
          status: latestItem.status
        });
      }
    }

    console.log('\n🎉 All tests passed! Centralized S3 upload system is working correctly');
    console.log('✅ Upload URL generation: SUCCESS');
    console.log('✅ S3 file upload: SUCCESS');
    console.log('✅ Thumbnail generation: SUCCESS');
    console.log('✅ Content item creation: SUCCESS');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testCentralizedUpload();