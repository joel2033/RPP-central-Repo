import { Response } from 'express';
import { z } from 'zod';
import { asyncHandler, createError } from '../utils/errorHandler';
import { clientService } from '../services/clientService';
import { insertClientSchema } from '@shared/schema';
import type { AuthenticatedRequest } from '../middleware/roleAuth';

const idParamSchema = z.object({
  id: z.string().transform(val => parseInt(val, 10)),
});

const querySchema = z.object({
  search: z.string().optional(),
  limit: z.string().transform(val => parseInt(val, 10)).optional(),
  offset: z.string().transform(val => parseInt(val, 10)).optional(),
});

export const getClients = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { search, limit = 50, offset = 0 } = req.query as any;
  const licenseeId = req.user.claims.sub;

  const clients = search 
    ? await clientService.searchClients(licenseeId, search)
    : await clientService.getAllClients(licenseeId);

  const paginatedClients = clients.slice(offset, offset + limit);
  
  res.json({
    data: paginatedClients,
    pagination: {
      total: clients.length,
      limit,
      offset,
      hasMore: offset + limit < clients.length,
    },
  });
});

export const getClient = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const licenseeId = req.user.claims.sub;

  const client = await clientService.getClientById(id, licenseeId);
  res.json(client);
});

export const createClient = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const licenseeId = req.user.claims.sub;
  const clientData = insertClientSchema.parse({
    ...req.body,
    licenseeId,
  });

  const client = await clientService.createClient(clientData);
  res.status(201).json(client);
});

export const updateClient = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const licenseeId = req.user.claims.sub;

  const updateData = insertClientSchema.partial().parse(req.body);
  const updatedClient = await clientService.updateClient(id, updateData, licenseeId);
  
  res.json(updatedClient);
});

export const deleteClient = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const licenseeId = req.user.claims.sub;

  await clientService.deleteClient(id, licenseeId);
  res.status(204).send();
});