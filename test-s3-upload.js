import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Test S3 configuration
async function testS3() {
  console.log('Testing S3 configuration...');
  
  const region = process.env.AWS_REGION?.includes('ap-southeast-2') ? 'ap-southeast-2' : process.env.AWS_REGION;
  const bucket = process.env.S3_BUCKET;
  
  console.log('S3 Config:', {
    region,
    bucket,
    hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
    hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
  });

  if (!region || !bucket) {
    console.error('Missing AWS environment variables');
    return;
  }

  const s3Client = new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  try {
    // Test presigned URL generation
    const testKey = 'test-uploads/test-file.txt';
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: testKey,
      ContentType: 'text/plain',
      Tagging: 'type=test',
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    console.log('✓ Successfully generated presigned URL:', uploadUrl.substring(0, 100) + '...');
    
    // Test a simple upload
    const testData = Buffer.from('Hello, S3!');
    const uploadCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: testKey,
      Body: testData,
      ContentType: 'text/plain',
      Tagging: 'type=test',
    });

    await s3Client.send(uploadCommand);
    console.log('✓ Successfully uploaded test file to S3');
    
    console.log('S3 configuration test completed successfully!');
  } catch (error) {
    console.error('❌ S3 test failed:', error.message);
    console.error('Error details:', {
      name: error.name,
      code: error.code,
      statusCode: error.$response?.statusCode
    });
  }
}

testS3().catch(console.error);