# RealEstate Media Pro

A comprehensive real estate media franchise management platform with React frontend and Express backend, featuring Firebase Storage integration, client management, job tracking, and robust file uploads.

## Setup Instructions

### Development Environment

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Set up the following environment variables:
   - `DATABASE_URL` - PostgreSQL connection string
   - `FIREBASE_SERVICE_ACCOUNT` or `GOOGLE_CLOUD_KEY` - Firebase credentials
   - `FIREBASE_STORAGE_BUCKET` - Firebase Storage bucket name

3. **Database Setup**
   ```bash
   npm run db:push
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

### Important Notes

- **Disable Replit Chrome Extension**: Go to `chrome://extensions/` and disable the Replit extension to avoid fetch errors during file uploads.

- **Firebase Emulator (Optional)**: For development testing with Firebase Storage emulator:
  ```bash
  firebase emulators:start --only storage
  ```

### Features

- Multi-tenant SaaS for real estate media businesses
- Job tracking from booking to delivery
- Firebase Storage integration for large media files (DNG, RAW, video)
- Chunked upload system for files up to 2GB
- Client management and booking system
- Production workflow with editor assignments
- Quality assurance and delivery tracking

### File Upload System

The platform supports:
- Professional photography formats (DNG, CR2, NEF, ARW, TIFF)
- Video formats (MP4, MOV, AVI)
- Large file handling with automatic chunked uploads
- Progress tracking and retry mechanisms
- Firebase Storage backend with CDN delivery

### Architecture

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Storage**: Firebase Storage
- **Authentication**: Replit Auth with OpenID Connect