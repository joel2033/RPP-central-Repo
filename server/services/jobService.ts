import { storage } from '../storage';
import { createError } from '../utils/errorHandler';
import { cache } from '../utils/cache';
import type { JobCard, InsertJobCard } from '@shared/schema';

export class JobService {
  private cachePrefix = 'job:';

  async getAllJobs(licenseeId: string, filters?: {
    status?: string;
    clientId?: number;
    limit?: number;
    offset?: number;
  }): Promise<JobCard[]> {
    const cacheKey = `${this.cachePrefix}list:${licenseeId}:${JSON.stringify(filters || {})}`;
    const cached = cache.get<JobCard[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const jobs = await storage.getJobCardsByLicenseeId(licenseeId);
    
    let filteredJobs = jobs;
    
    if (filters?.status) {
      filteredJobs = filteredJobs.filter(job => job.status === filters.status);
    }
    
    if (filters?.clientId) {
      filteredJobs = filteredJobs.filter(job => job.clientId === filters.clientId);
    }
    
    if (filters?.offset || filters?.limit) {
      const start = filters.offset || 0;
      const end = start + (filters.limit || 50);
      filteredJobs = filteredJobs.slice(start, end);
    }

    cache.set(cacheKey, filteredJobs, 2 * 60 * 1000); // 2 minutes for lists
    
    return filteredJobs;
  }

  async getJobById(id: number, licenseeId: string): Promise<JobCard> {
    const cacheKey = `${this.cachePrefix}${id}`;
    const cached = cache.get<JobCard>(cacheKey);
    
    if (cached && cached.licenseeId === licenseeId) {
      return cached;
    }

    const job = await storage.getJobCard(id);
    
    if (!job) {
      throw createError('Job not found', 404, 'JOB_NOT_FOUND');
    }
    
    if (job.licenseeId !== licenseeId) {
      throw createError('Job not found', 404, 'JOB_NOT_FOUND');
    }

    cache.set(cacheKey, job);
    return job;
  }

  async updateJobStatus(id: number, status: string, licenseeId: string): Promise<JobCard> {
    // Verify ownership first
    await this.getJobById(id, licenseeId);
    
    const updatedJob = await storage.updateJobCard(id, { status });
    
    // Invalidate caches
    cache.delete(`${this.cachePrefix}${id}`);
    // Clear all list caches for this licensee
    this.clearListCaches(licenseeId);
    
    return updatedJob;
  }

  async getJobFiles(jobId: number, licenseeId: string): Promise<any[]> {
    // Verify job ownership first
    await this.getJobById(jobId, licenseeId);
    
    return await storage.getProductionFilesByJobCardId(jobId);
  }

  async getJobActivity(jobId: number, licenseeId: string): Promise<any[]> {
    // Verify job ownership first
    await this.getJobById(jobId, licenseeId);
    
    return await storage.getJobActivityByJobCardId(jobId);
  }

  private clearListCaches(licenseeId: string): void {
    // This is a simple approach - in production you might want more sophisticated cache invalidation
    cache.clear();
  }
}

export const jobService = new JobService();