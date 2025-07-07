import {
  users,
  clients,
  bookings,
  mediaFiles,
  qaChecklists,
  communications,
  type User,
  type UpsertUser,
  type Client,
  type InsertClient,
  type Booking,
  type InsertBooking,
  type MediaFile,
  type InsertMediaFile,
  type QaChecklist,
  type InsertQaChecklist,
  type Communication,
  type InsertCommunication,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, count } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Client operations
  getClients(licenseeId: string): Promise<Client[]>;
  getClient(id: number, licenseeId: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>, licenseeId: string): Promise<Client>;
  deleteClient(id: number, licenseeId: string): Promise<void>;
  
  // Booking operations
  getBookings(licenseeId: string): Promise<(Booking & { client: Client; photographer: User | null })[]>;
  getBooking(id: number, licenseeId: string): Promise<(Booking & { client: Client; photographer: User | null }) | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, booking: Partial<InsertBooking>, licenseeId: string): Promise<Booking>;
  deleteBooking(id: number, licenseeId: string): Promise<void>;
  
  // Media file operations
  getMediaFiles(bookingId: number): Promise<MediaFile[]>;
  createMediaFile(mediaFile: InsertMediaFile): Promise<MediaFile>;
  deleteMediaFile(id: number): Promise<void>;
  
  // QA checklist operations
  getQaChecklist(bookingId: number): Promise<QaChecklist | undefined>;
  createQaChecklist(qaChecklist: InsertQaChecklist): Promise<QaChecklist>;
  updateQaChecklist(id: number, qaChecklist: Partial<InsertQaChecklist>): Promise<QaChecklist>;
  
  // Communication operations
  getCommunications(clientId: number): Promise<Communication[]>;
  createCommunication(communication: InsertCommunication): Promise<Communication>;
  
  // Dashboard statistics
  getDashboardStats(licenseeId: string): Promise<{
    totalClients: number;
    activeJobs: number;
    completedJobs: number;
    monthlyRevenue: number;
  }>;
  
  // Photographers
  getPhotographers(licenseeId: string): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Client operations
  async getClients(licenseeId: string): Promise<Client[]> {
    return await db
      .select()
      .from(clients)
      .where(eq(clients.licenseeId, licenseeId))
      .orderBy(desc(clients.createdAt));
  }

  async getClient(id: number, licenseeId: string): Promise<Client | undefined> {
    const [client] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, id), eq(clients.licenseeId, licenseeId)));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db
      .insert(clients)
      .values(client)
      .returning();
    return newClient;
  }

  async updateClient(id: number, client: Partial<InsertClient>, licenseeId: string): Promise<Client> {
    const [updatedClient] = await db
      .update(clients)
      .set({ ...client, updatedAt: new Date() })
      .where(and(eq(clients.id, id), eq(clients.licenseeId, licenseeId)))
      .returning();
    return updatedClient;
  }

  async deleteClient(id: number, licenseeId: string): Promise<void> {
    await db
      .delete(clients)
      .where(and(eq(clients.id, id), eq(clients.licenseeId, licenseeId)));
  }

  // Booking operations
  async getBookings(licenseeId: string): Promise<(Booking & { client: Client; photographer: User | null })[]> {
    const results = await db
      .select({
        id: bookings.id,
        clientId: bookings.clientId,
        propertyAddress: bookings.propertyAddress,
        scheduledDate: bookings.scheduledDate,
        scheduledTime: bookings.scheduledTime,
        services: bookings.services,
        status: bookings.status,
        photographerId: bookings.photographerId,
        notes: bookings.notes,
        price: bookings.price,
        licenseeId: bookings.licenseeId,
        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,
        client: clients,
        photographer: users,
      })
      .from(bookings)
      .innerJoin(clients, eq(bookings.clientId, clients.id))
      .leftJoin(users, eq(bookings.photographerId, users.id))
      .where(eq(bookings.licenseeId, licenseeId))
      .orderBy(desc(bookings.scheduledDate));
    
    return results as (Booking & { client: Client; photographer: User | null })[];
  }

  async getBooking(id: number, licenseeId: string): Promise<(Booking & { client: Client; photographer: User | null }) | undefined> {
    const [booking] = await db
      .select({
        id: bookings.id,
        clientId: bookings.clientId,
        propertyAddress: bookings.propertyAddress,
        scheduledDate: bookings.scheduledDate,
        scheduledTime: bookings.scheduledTime,
        services: bookings.services,
        status: bookings.status,
        photographerId: bookings.photographerId,
        notes: bookings.notes,
        price: bookings.price,
        licenseeId: bookings.licenseeId,
        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,
        client: clients,
        photographer: users,
      })
      .from(bookings)
      .innerJoin(clients, eq(bookings.clientId, clients.id))
      .leftJoin(users, eq(bookings.photographerId, users.id))
      .where(and(eq(bookings.id, id), eq(bookings.licenseeId, licenseeId)));
    return booking as (Booking & { client: Client; photographer: User | null }) | undefined;
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db
      .insert(bookings)
      .values(booking)
      .returning();
    return newBooking;
  }

  async updateBooking(id: number, booking: Partial<InsertBooking>, licenseeId: string): Promise<Booking> {
    const [updatedBooking] = await db
      .update(bookings)
      .set({ ...booking, updatedAt: new Date() })
      .where(and(eq(bookings.id, id), eq(bookings.licenseeId, licenseeId)))
      .returning();
    return updatedBooking;
  }

  async deleteBooking(id: number, licenseeId: string): Promise<void> {
    await db
      .delete(bookings)
      .where(and(eq(bookings.id, id), eq(bookings.licenseeId, licenseeId)));
  }

  // Media file operations
  async getMediaFiles(bookingId: number): Promise<MediaFile[]> {
    return await db
      .select()
      .from(mediaFiles)
      .where(eq(mediaFiles.bookingId, bookingId))
      .orderBy(desc(mediaFiles.uploadedAt));
  }

  async createMediaFile(mediaFile: InsertMediaFile): Promise<MediaFile> {
    const [newMediaFile] = await db
      .insert(mediaFiles)
      .values(mediaFile)
      .returning();
    return newMediaFile;
  }

  async deleteMediaFile(id: number): Promise<void> {
    await db
      .delete(mediaFiles)
      .where(eq(mediaFiles.id, id));
  }

  // QA checklist operations
  async getQaChecklist(bookingId: number): Promise<QaChecklist | undefined> {
    const [qaChecklist] = await db
      .select()
      .from(qaChecklists)
      .where(eq(qaChecklists.bookingId, bookingId));
    return qaChecklist;
  }

  async createQaChecklist(qaChecklist: InsertQaChecklist): Promise<QaChecklist> {
    const [newQaChecklist] = await db
      .insert(qaChecklists)
      .values(qaChecklist)
      .returning();
    return newQaChecklist;
  }

  async updateQaChecklist(id: number, qaChecklist: Partial<InsertQaChecklist>): Promise<QaChecklist> {
    const [updatedQaChecklist] = await db
      .update(qaChecklists)
      .set(qaChecklist)
      .where(eq(qaChecklists.id, id))
      .returning();
    return updatedQaChecklist;
  }

  // Communication operations
  async getCommunications(clientId: number): Promise<Communication[]> {
    return await db
      .select()
      .from(communications)
      .where(eq(communications.clientId, clientId))
      .orderBy(desc(communications.timestamp));
  }

  async createCommunication(communication: InsertCommunication): Promise<Communication> {
    const [newCommunication] = await db
      .insert(communications)
      .values(communication)
      .returning();
    return newCommunication;
  }

  // Dashboard statistics
  async getDashboardStats(licenseeId: string): Promise<{
    totalClients: number;
    activeJobs: number;
    completedJobs: number;
    monthlyRevenue: number;
  }> {
    const [totalClientsResult] = await db
      .select({ count: count() })
      .from(clients)
      .where(eq(clients.licenseeId, licenseeId));

    const [activeJobsResult] = await db
      .select({ count: count() })
      .from(bookings)
      .where(and(
        eq(bookings.licenseeId, licenseeId),
        eq(bookings.status, 'confirmed')
      ));

    const [completedJobsResult] = await db
      .select({ count: count() })
      .from(bookings)
      .where(and(
        eq(bookings.licenseeId, licenseeId),
        eq(bookings.status, 'completed')
      ));

    const [monthlyRevenueResult] = await db
      .select({ 
        total: sql<number>`COALESCE(SUM(${bookings.price}), 0)` 
      })
      .from(bookings)
      .where(and(
        eq(bookings.licenseeId, licenseeId),
        eq(bookings.status, 'completed'),
        sql`${bookings.createdAt} >= date_trunc('month', current_date)`
      ));

    return {
      totalClients: totalClientsResult.count,
      activeJobs: activeJobsResult.count,
      completedJobs: completedJobsResult.count,
      monthlyRevenue: monthlyRevenueResult.total || 0,
    };
  }

  // Photographers
  async getPhotographers(licenseeId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(
        eq(users.licenseeId, licenseeId),
        eq(users.role, 'photographer')
      ))
      .orderBy(users.firstName);
  }
}

export const storage = new DatabaseStorage();
