# S3 Lifecycle Policy Setup for RAW File Auto-Deletion

This document explains how to set up S3 lifecycle policies to automatically delete RAW files after 14 days and optimize storage costs for finished files.

## Step 5: S3 Lifecycle Policy Implementation

### Option 1: AWS Console Setup

1. **Navigate to S3 Management Console**
   - Go to AWS S3 Console
   - Select your bucket: `rppcentral`
   - Go to "Management" tab
   - Click "Lifecycle rules"

2. **Create New Lifecycle Rule**
   - Rule name: `AutoDeleteRawFiles`
   - Rule scope: "Filter objects by prefix and tags"
   - Prefix: `job-cards/`
   - Tags: `type = raw`
   - Delete objects: After 14 days

3. **Optional: Add Rule for Finished Files**
   - Rule name: `OptimizeFinishedFiles`
   - Rule scope: "Filter objects by prefix and tags" 
   - Prefix: `job-cards/`
   - Tags: `type = finished`
   - Transitions: 
     - Standard-IA after 90 days
     - Glacier after 365 days

### Option 2: AWS CLI Setup

```bash
# Apply the lifecycle configuration
aws s3api put-bucket-lifecycle-configuration \
  --bucket rppcentral \
  --lifecycle-configuration file://s3-lifecycle-policy.json

# Verify the configuration
aws s3api get-bucket-lifecycle-configuration --bucket rppcentral
```

### Option 3: Terraform/IaC

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "raw_files_cleanup" {
  bucket = "rppcentral"

  rule {
    id     = "DeleteRawAfter14Days"
    status = "Enabled"

    filter {
      and {
        prefix = "job-cards/"
        tags = {
          type = "raw"
        }
      }
    }

    expiration {
      days = 14
    }
  }

  rule {
    id     = "OptimizeFinishedFiles"
    status = "Enabled"

    filter {
      and {
        prefix = "job-cards/"
        tags = {
          type = "finished"
        }
      }
    }

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 365
      storage_class = "GLACIER"
    }
  }
}
```

## How It Works

### RAW File Lifecycle
1. **Upload**: Photographer uploads RAW files via "Upload to Editor" flow
2. **S3 Tagging**: Files automatically tagged with `type: raw`
3. **Processing**: Editor downloads, processes, uploads finished files
4. **Auto-Deletion**: RAW files automatically deleted after 14 days
5. **Database Tracking**: Upload metadata retained in database for audit

### Finished File Lifecycle  
1. **Upload**: Editor uploads finished JPEG files via dashboard
2. **S3 Tagging**: Files automatically tagged with `type: finished`
3. **Long-term Storage**: Files moved to cheaper storage classes over time
4. **Client Access**: Files remain accessible via delivery pages indefinitely

## Benefits

- **Cost Optimization**: RAW files (large) auto-deleted, finished files (smaller) kept longer
- **Storage Management**: Automatic cleanup prevents storage bloat
- **Audit Trail**: Database retains metadata even after S3 files are deleted
- **Access Control**: Only uploader or licensee can access files
- **Compliance**: 14-day retention meets typical editing workflow needs

## Monitoring

The lifecycle policy will:
- Run daily to check for expired objects
- Delete RAW files older than 14 days automatically
- Transition finished files to cheaper storage classes
- Generate CloudWatch metrics for monitoring

## Database vs S3 Storage

- **Database**: Stores metadata (fileName, uploaderId, jobId, timestamps) permanently
- **S3**: Stores actual file content with automatic lifecycle management
- **Benefits**: Complete audit trail even after files are deleted from S3