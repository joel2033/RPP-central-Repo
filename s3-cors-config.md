# S3 CORS Configuration for Replit

The DNG file upload failures are caused by CORS (Cross-Origin Resource Sharing) restrictions on your S3 bucket. The bucket needs to allow PUT requests from your Replit domain.

## Required S3 CORS Configuration

Add this CORS configuration to your S3 bucket:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": [
      "https://*.replit.dev",
      "https://*.replit.app",
      "https://replit.com"
    ],
    "ExposeHeaders": [
      "ETag",
      "x-amz-meta-custom-header"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

## How to Configure in AWS Console

1. Go to your S3 bucket in AWS Console
2. Navigate to "Permissions" tab
3. Scroll down to "Cross-origin resource sharing (CORS)"
4. Click "Edit"
5. Paste the JSON configuration above
6. Click "Save changes"

## How to Configure via AWS CLI

```bash
aws s3api put-bucket-cors --bucket your-bucket-name --cors-configuration file://cors-config.json
```

Where `cors-config.json` contains the JSON configuration above.

## Testing

After applying the CORS configuration:
1. Wait 5-10 minutes for the changes to propagate
2. Try uploading DNG files again
3. The uploads should now succeed without "Network error" or "CORS error"

## Current Status

- ✅ Presigned URLs are being generated successfully
- ✅ DNG file type validation is working
- ✅ Enhanced error handling with specific CORS error detection
- ❌ S3 bucket CORS policy needs to be configured