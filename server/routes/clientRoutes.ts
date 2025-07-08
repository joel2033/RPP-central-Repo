import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../utils/validation';
import { isAuthenticated } from '../replitAuth';
import { insertClientSchema } from '@shared/schema';
import { z } from 'zod';
import {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
} from '../controllers/clientController';

const router = Router();

const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a number'),
});

const clientQuerySchema = z.object({
  search: z.string().optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  offset: z.string().regex(/^\d+$/).optional(),
});

// All routes require authentication
router.use(isAuthenticated);

// GET /api/clients - Get all clients with optional search and pagination
router.get('/', validateQuery(clientQuerySchema), getClients);

// GET /api/clients/:id - Get specific client
router.get('/:id', validateParams(idParamSchema), getClient);

// POST /api/clients - Create new client
router.post('/', validateBody(insertClientSchema.omit({ licenseeId: true })), createClient);

// PUT /api/clients/:id - Update client
router.put('/:id', validateParams(idParamSchema), validateBody(insertClientSchema.partial()), updateClient);

// DELETE /api/clients/:id - Delete client
router.delete('/:id', validateParams(idParamSchema), deleteClient);

export default router;