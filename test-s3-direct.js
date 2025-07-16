import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Test S3 connectivity and presigned URL generation
async function testS3() {
    console.log('Testing S3 connectivity...');
    
    // Check environment variables
    console.log('Environment variables:', {
        AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
        AWS_REGION: process.env.AWS_REGION,
        S3_BUCKET: process.env.S3_BUCKET
    });
    
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION || !process.env.S3_BUCKET) {
        console.error('Missing required environment variables');
        return;
    }
    
    // Extract region code from full region description
    const regionCode = process.env.AWS_REGION?.split(' ').pop() || 'ap-southeast-2';
    console.log('Using region code:', regionCode);
    
    const s3Client = new S3Client({
        region: regionCode,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
    });
    
    try {
        const key = 'test-files/test-upload-' + Date.now() + '.txt';
        const contentType = 'text/plain';
        const tags = 'type=raw';
        
        console.log('Generating presigned URL for:', { key, contentType, tags });
        
        const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: key,
            ContentType: contentType,
            Tagging: tags,
        });
        
        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        
        console.log('✅ Successfully generated presigned URL');
        console.log('Upload URL length:', uploadUrl.length);
        console.log('URL starts with:', uploadUrl.substring(0, 100) + '...');
        
        // Test actual upload
        const testContent = 'Hello S3 from test script!';
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            body: testContent,
            headers: {
                'Content-Type': contentType,
            },
        });
        
        if (response.ok) {
            console.log('✅ Successfully uploaded test file to S3');
            console.log('Response status:', response.status);
        } else {
            console.error('❌ Failed to upload test file:', response.status, response.statusText);
        }
        
    } catch (error) {
        console.error('❌ S3 Test Error:', {
            message: error.message,
            code: error.code,
            name: error.name,
            requestId: error.$metadata?.requestId,
            statusCode: error.$metadata?.httpStatusCode
        });
    }
}

testS3().catch(console.error);