import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../utils/validation';
import { isAuthenticated } from '../replitAuth';
import { z } from 'zod';
import {
  getJobs,
  getJob,
  updateJobStatus,
  getJobFiles,
  getJobActivity,
} from '../controllers/jobController';

const router = Router();

const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a number'),
});

const jobQuerySchema = z.object({
  status: z.string().optional(),
  clientId: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  offset: z.string().regex(/^\d+$/).optional(),
});

const statusUpdateSchema = z.object({
  status: z.string().min(1, 'Status is required'),
});

// All routes require authentication
router.use(isAuthenticated);

// GET /api/jobs - Get all jobs with optional filters
router.get('/', validateQuery(jobQuerySchema), getJobs);

// GET /api/jobs/:id - Get specific job
router.get('/:id', validateParams(idParamSchema), getJob);

// PATCH /api/jobs/:id - Update job status
router.patch('/:id', validateParams(idParamSchema), validateBody(statusUpdateSchema), updateJobStatus);

// GET /api/jobs/:id/files - Get job files
router.get('/:id/files', validateParams(idParamSchema), getJobFiles);

// GET /api/jobs/:id/activity - Get job activity
router.get('/:id/activity', validateParams(idParamSchema), getJobActivity);

export default router;