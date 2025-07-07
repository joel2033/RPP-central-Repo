import fs from "fs/promises";
import path from "path";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";

export class FileStorageService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), "uploads");
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(fileBuffer: Buffer, fileName: string, jobCardId: number): Promise<string> {
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const uniqueFileName = `${jobCardId}_${timestamp}_${sanitizedFileName}`;
    const filePath = path.join(this.uploadDir, uniqueFileName);
    
    await fs.writeFile(filePath, fileBuffer);
    return uniqueFileName;
  }

  async getFile(fileName: string): Promise<Buffer> {
    const filePath = path.join(this.uploadDir, fileName);
    return await fs.readFile(filePath);
  }

  async deleteFile(fileName: string): Promise<void> {
    const filePath = path.join(this.uploadDir, fileName);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Failed to delete file ${fileName}:`, error);
    }
  }

  getFileUrl(fileName: string): string {
    return `/api/files/${fileName}`;
  }
}

export const fileStorage = new FileStorageService();