import { storage } from '../storage';
import { createError } from '../utils/errorHandler';
import { cache } from '../utils/cache';
import type { Client, InsertClient } from '@shared/schema';

export class ClientService {
  private cachePrefix = 'client:';

  async getAllClients(licenseeId: string): Promise<Client[]> {
    const cacheKey = `${this.cachePrefix}list:${licenseeId}`;
    const cached = cache.get<Client[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const clients = await storage.getClientsByLicenseeId(licenseeId);
    cache.set(cacheKey, clients, 5 * 60 * 1000); // 5 minutes
    
    return clients;
  }

  async getClientById(id: number, licenseeId: string): Promise<Client> {
    const cacheKey = `${this.cachePrefix}${id}`;
    const cached = cache.get<Client>(cacheKey);
    
    if (cached && cached.licenseeId === licenseeId) {
      return cached;
    }

    const client = await storage.getClient(id);
    
    if (!client) {
      throw createError('Client not found', 404, 'CLIENT_NOT_FOUND');
    }
    
    if (client.licenseeId !== licenseeId) {
      throw createError('Client not found', 404, 'CLIENT_NOT_FOUND');
    }

    cache.set(cacheKey, client);
    return client;
  }

  async createClient(data: InsertClient): Promise<Client> {
    const client = await storage.createClient(data);
    
    // Invalidate list cache
    cache.delete(`${this.cachePrefix}list:${data.licenseeId}`);
    
    return client;
  }

  async updateClient(id: number, data: Partial<InsertClient>, licenseeId: string): Promise<Client> {
    // Verify ownership first
    await this.getClientById(id, licenseeId);
    
    const updatedClient = await storage.updateClient(id, data);
    
    // Invalidate caches
    cache.delete(`${this.cachePrefix}${id}`);
    cache.delete(`${this.cachePrefix}list:${licenseeId}`);
    
    return updatedClient;
  }

  async deleteClient(id: number, licenseeId: string): Promise<void> {
    // Verify ownership first
    await this.getClientById(id, licenseeId);
    
    await storage.deleteClient(id);
    
    // Invalidate caches
    cache.delete(`${this.cachePrefix}${id}`);
    cache.delete(`${this.cachePrefix}list:${licenseeId}`);
  }

  async searchClients(licenseeId: string, searchTerm: string): Promise<Client[]> {
    const clients = await this.getAllClients(licenseeId);
    
    if (!searchTerm) {
      return clients;
    }

    const searchLower = searchTerm.toLowerCase();
    return clients.filter(client =>
      client.name.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower) ||
      client.contactName?.toLowerCase().includes(searchLower)
    );
  }
}

export const clientService = new ClientService();