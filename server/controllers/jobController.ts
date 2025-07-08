import { Response } from 'express';
import { z } from 'zod';
import { asyncHandler, createError } from '../utils/errorHandler';
import { jobService } from '../services/jobService';
import type { AuthenticatedRequest } from '../middleware/roleAuth';

const idParamSchema = z.object({
  id: z.string().transform(val => parseInt(val, 10)),
});

const jobQuerySchema = z.object({
  status: z.string().optional(),
  clientId: z.string().transform(val => parseInt(val, 10)).optional(),
  limit: z.string().transform(val => parseInt(val, 10)).optional(),
  offset: z.string().transform(val => parseInt(val, 10)).optional(),
});

const statusUpdateSchema = z.object({
  status: z.string().min(1, 'Status is required'),
});

export const getJobs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const filters = jobQuerySchema.parse(req.query);
  const licenseeId = req.user.claims.sub;

  const jobs = await jobService.getAllJobs(licenseeId, filters);
  
  res.json({
    data: jobs,
    pagination: {
      total: jobs.length,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
      hasMore: false, // Could implement proper pagination
    },
  });
});

export const getJob = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const licenseeId = req.user.claims.sub;

  const job = await jobService.getJobById(id, licenseeId);
  res.json(job);
});

export const updateJobStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const { status } = statusUpdateSchema.parse(req.body);
  const licenseeId = req.user.claims.sub;

  const updatedJob = await jobService.updateJobStatus(id, status, licenseeId);
  res.json(updatedJob);
});

export const getJobFiles = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const licenseeId = req.user.claims.sub;

  const files = await jobService.getJobFiles(id, licenseeId);
  res.json(files);
});

export const getJobActivity = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const licenseeId = req.user.claims.sub;

  const activity = await jobService.getJobActivity(id, licenseeId);
  res.json(activity);
});