import { Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { asyncHandler, createError } from '../utils/errorHandler';
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

  const clients = await storage.getClientsByLicenseeId(licenseeId);
  
  let filteredClients = clients;
  if (search) {
    const searchLower = search.toLowerCase();
    filteredClients = clients.filter(client =>
      client.name.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower) ||
      client.contactName?.toLowerCase().includes(searchLower)
    );
  }

  const paginatedClients = filteredClients.slice(offset, offset + limit);
  
  res.json({
    data: paginatedClients,
    pagination: {
      total: filteredClients.length,
      limit,
      offset,
      hasMore: offset + limit < filteredClients.length,
    },
  });
});

export const getClient = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const licenseeId = req.user.claims.sub;

  const client = await storage.getClient(id);
  
  if (!client || client.licenseeId !== licenseeId) {
    throw createError('Client not found', 404, 'CLIENT_NOT_FOUND');
  }

  res.json(client);
});

export const createClient = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const licenseeId = req.user.claims.sub;
  const clientData = insertClientSchema.parse({
    ...req.body,
    licenseeId,
  });

  const client = await storage.createClient(clientData);
  res.status(201).json(client);
});

export const updateClient = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const licenseeId = req.user.claims.sub;

  const existingClient = await storage.getClient(id);
  if (!existingClient || existingClient.licenseeId !== licenseeId) {
    throw createError('Client not found', 404, 'CLIENT_NOT_FOUND');
  }

  const updateData = insertClientSchema.partial().parse(req.body);
  const updatedClient = await storage.updateClient(id, updateData);
  
  res.json(updatedClient);
});

export const deleteClient = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const licenseeId = req.user.claims.sub;

  const client = await storage.getClient(id);
  if (!client || client.licenseeId !== licenseeId) {
    throw createError('Client not found', 404, 'CLIENT_NOT_FOUND');
  }

  await storage.deleteClient(id);
  res.status(204).send();
});