import {
  users,
  clients,
  bookings,
  mediaFiles,
  qaChecklists,
  communications,
  jobCards,
  productionFiles,
  productionNotifications,
  calendarEvents,
  businessSettings,
  googleCalendarIntegrations,
  calendarSyncLogs,
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
  type JobCard,
  type InsertJobCard,
  type ProductionFile,
  type InsertProductionFile,
  type ProductionNotification,
  type InsertProductionNotification,
  type CalendarEvent,
  type InsertCalendarEvent,
  type BusinessSettings,
  type InsertBusinessSettings,
  type GoogleCalendarIntegration,
  type InsertGoogleCalendarIntegration,
  type CalendarSyncLog,
  type InsertCalendarSyncLog,
  deliveryComments,
  deliveryTracking,
  jobCardDeliverySettings,
  orderStatusAudit,
  emailDeliveryLog,
  type DeliveryComment,
  type InsertDeliveryComment,
  type DeliveryTracking,
  type InsertDeliveryTracking,
  type JobCardDeliverySettings,
  type InsertJobCardDeliverySettings,
  type OrderStatusAudit,
  type InsertOrderStatusAudit,
  type EmailDeliveryLog,
  type InsertEmailDeliveryLog,
  products,
  type Product,
  type InsertProduct,
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
  
  // Photographers and Editors
  getPhotographers(licenseeId: string): Promise<User[]>;
  getEditors(licenseeId: string): Promise<User[]>;
  
  // Production workflow operations
  getJobCards(licenseeId: string): Promise<(JobCard & { client: Client; photographer: User | null; editor: User | null })[]>;
  getJobCard(id: number, licenseeId: string): Promise<(JobCard & { client: Client; photographer: User | null; editor: User | null }) | undefined>;
  createJobCard(jobCard: InsertJobCard): Promise<JobCard>;
  updateJobCard(id: number, jobCard: Partial<InsertJobCard>, licenseeId: string): Promise<JobCard>;
  getJobCardsByEditor(editorId: string, licenseeId: string): Promise<(JobCard & { client: Client; photographer: User | null })[]>;
  getJobCardsByStatus(status: string, licenseeId: string): Promise<(JobCard & { client: Client; photographer: User | null; editor: User | null })[]>;
  
  // Production files operations
  getProductionFiles(jobCardId: number): Promise<ProductionFile[]>;
  createProductionFile(file: InsertProductionFile): Promise<ProductionFile>;
  deleteProductionFile(id: number): Promise<void>;
  getProductionFilesByType(jobCardId: number, mediaType: string, serviceCategory?: string): Promise<ProductionFile[]>;
  
  // Notifications
  getNotifications(userId: string): Promise<ProductionNotification[]>;
  createNotification(notification: InsertProductionNotification): Promise<ProductionNotification>;
  markNotificationAsRead(id: number): Promise<void>;
  
  // Activity Log - simplified for now
  getJobActivityLog(jobCardId: number): Promise<any[]>;
  createJobActivityLog(log: any): Promise<any>;
  
  // Calendar Events
  getCalendarEvents(licenseeId: string, photographerId?: string): Promise<CalendarEvent[]>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: number, event: Partial<InsertCalendarEvent>): Promise<CalendarEvent>;
  deleteCalendarEvent(id: number): Promise<void>;
  
  // Business Settings
  getBusinessSettings(licenseeId: string): Promise<BusinessSettings | undefined>;
  upsertBusinessSettings(settings: InsertBusinessSettings): Promise<BusinessSettings>;
  
  // Google Calendar Integration
  getGoogleCalendarIntegration(userId: string): Promise<GoogleCalendarIntegration | undefined>;
  createGoogleCalendarIntegration(integration: InsertGoogleCalendarIntegration): Promise<GoogleCalendarIntegration>;
  updateGoogleCalendarIntegration(id: number, integration: Partial<InsertGoogleCalendarIntegration>): Promise<GoogleCalendarIntegration>;
  deleteGoogleCalendarIntegration(userId: string): Promise<void>;
  
  // Calendar Sync Logs
  createCalendarSyncLog(log: InsertCalendarSyncLog): Promise<CalendarSyncLog>;
  getCalendarSyncLogByEventId(eventId: string): Promise<CalendarSyncLog | undefined>;
  getCalendarEventByGoogleId(googleEventId: string): Promise<CalendarEvent | undefined>;
  
  // Delivery functionality
  getJobCardDeliverySettings(jobCardId: number): Promise<JobCardDeliverySettings | undefined>;
  createJobCardDeliverySettings(settings: InsertJobCardDeliverySettings): Promise<JobCardDeliverySettings>;
  updateJobCardDeliverySettings(jobCardId: number, settings: Partial<InsertJobCardDeliverySettings>): Promise<JobCardDeliverySettings>;
  
  getDeliveryComments(jobCardId: number): Promise<DeliveryComment[]>;
  createDeliveryComment(comment: InsertDeliveryComment): Promise<DeliveryComment>;
  updateDeliveryComment(id: number, comment: Partial<InsertDeliveryComment>): Promise<DeliveryComment>;
  
  createDeliveryTracking(tracking: InsertDeliveryTracking): Promise<DeliveryTracking>;
  getDeliveryTracking(jobCardId: number): Promise<DeliveryTracking[]>;
  
  // Public delivery page access (no authentication required)
  getJobCardForDelivery(jobCardId: number): Promise<(JobCard & { client: Client; deliverySettings?: JobCardDeliverySettings }) | undefined>;
  getJobCardByDeliveryUrl(deliveryUrl: string): Promise<(JobCard & { client: Client; deliverySettings?: JobCardDeliverySettings }) | undefined>;
  
  // Product operations
  getProducts(licenseeId: string): Promise<Product[]>;
  getProduct(id: string, licenseeId: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>, licenseeId: string): Promise<Product>;
  deleteProduct(id: string, licenseeId: string): Promise<void>;
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
    
    // Auto-generate job card when booking is created
    const jobCardData: InsertJobCard = {
      bookingId: newBooking.id,
      clientId: newBooking.clientId,
      photographerId: newBooking.photographerId,
      requestedServices: newBooking.services,
      status: "unassigned",
      jobStatus: "upcoming", // Set initial job status
      licenseeId: newBooking.licenseeId,
    };

    // Get client editing preferences to auto-fill notes
    const client = await db
      .select()
      .from(clients)
      .where(eq(clients.id, newBooking.clientId))
      .limit(1);

    if (client[0]?.editingPreferences) {
      jobCardData.editingNotes = JSON.stringify(client[0].editingPreferences);
    }

    const jobCard = await this.createJobCard(jobCardData);
    console.log("Created job card:", jobCard);
    
    // Create calendar event for the booking
    try {
      // Parse the time string (e.g., "2:15PM") to 24-hour format
      const parseTime = (timeStr: string): string => {
        const [time, period] = timeStr.split(/([AP]M)/);
        const [hours, minutes] = time.split(':');
        let hour = parseInt(hours);
        
        if (period === 'PM' && hour !== 12) {
          hour += 12;
        } else if (period === 'AM' && hour === 12) {
          hour = 0;
        }
        
        return `${hour.toString().padStart(2, '0')}:${minutes || '00'}`;
      };
      
      const timeString = parseTime(newBooking.scheduledTime);
      const startDateTime = new Date(`${newBooking.scheduledDate}T${timeString}:00`);
      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + (newBooking.duration || 60));

      const calendarEventData: InsertCalendarEvent = {
        title: `${newBooking.propertyAddress} - ${client[0]?.name || 'Photography Session'}`,
        description: `Photography booking for ${newBooking.propertyAddress}. Services: ${newBooking.services?.join(', ') || 'N/A'}`,
        start: startDateTime,
        end: endDateTime,
        allDay: false,
        type: 'job',
        photographerId: newBooking.photographerId,
        licenseeId: newBooking.licenseeId,
        bookingId: newBooking.id,
        createdBy: newBooking.licenseeId,
      };

      await this.createCalendarEvent(calendarEventData);
      
      // Create initial activity log entry
      await this.createJobActivityLog({
        jobCardId: jobCard.id,
        userId: booking.licenseeId,
        action: "booking_created",
        description: "Job created from booking and added to calendar"
      });
      
    } catch (error) {
      console.error("Failed to create calendar event or activity log:", error);
      // Don't fail the booking creation if calendar event fails
    }
    
    console.log("Booking creation completed, returning booking:", newBooking);
    
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

  async getEditors(licenseeId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(
        eq(users.licenseeId, licenseeId),
        eq(users.role, 'editor')
      ))
      .orderBy(users.firstName);
  }

  // Production workflow operations
  async getJobCards(licenseeId: string): Promise<(JobCard & { client: Client; photographer: User | null; editor: User | null })[]> {
    const results = await db
      .select({
        jobCard: {
          id: jobCards.id,
          jobId: jobCards.jobId,
          bookingId: jobCards.bookingId,
          clientId: jobCards.clientId,
          photographerId: jobCards.photographerId,
          editorId: jobCards.editorId,
          status: jobCards.status,
          jobStatus: jobCards.jobStatus,
          requestedServices: jobCards.requestedServices,
          editingNotes: jobCards.editingNotes,
          revisionNotes: jobCards.revisionNotes,
          assignedAt: jobCards.assignedAt,
          completedAt: jobCards.completedAt,
          deliveredAt: jobCards.deliveredAt,
          licenseeId: jobCards.licenseeId,
          createdAt: jobCards.createdAt,
          updatedAt: jobCards.updatedAt,
          // Only include new timestamp fields if they exist in schema
          // uploadedAt: jobCards.uploadedAt,
          // acceptedAt: jobCards.acceptedAt,
          // readyForQCAt: jobCards.readyForQCAt,
          // revisionRequestedAt: jobCards.revisionRequestedAt,
          // history: jobCards.history,
        },
        client: clients,
        photographer: users,
        editor: {
          id: sql`editor.id`,
          email: sql`editor.email`,
          firstName: sql`editor.first_name`,
          lastName: sql`editor.last_name`,
          profileImageUrl: sql`editor.profile_image_url`,
          role: sql`editor.role`,
          licenseeId: sql`editor.licensee_id`,
          createdAt: sql`editor.created_at`,
          updatedAt: sql`editor.updated_at`,
        }
      })
      .from(jobCards)
      .leftJoin(clients, eq(jobCards.clientId, clients.id))
      .leftJoin(users, eq(jobCards.photographerId, users.id))
      .leftJoin(sql`users AS editor`, sql`${jobCards.editorId} = editor.id`)
      .where(eq(jobCards.licenseeId, licenseeId))
      .orderBy(desc(jobCards.createdAt));

    return results.map(result => ({
      ...result.jobCard,
      client: result.client!,
      photographer: result.photographer,
      editor: result.editor.id ? result.editor as User : null,
    }));
  }

  async getJobCard(id: number, licenseeId: string): Promise<(JobCard & { client: Client; photographer: User | null; editor: User | null }) | undefined> {
    const result = await db
      .select({
        jobCard: {
          id: jobCards.id,
          jobId: jobCards.jobId,
          bookingId: jobCards.bookingId,
          clientId: jobCards.clientId,
          photographerId: jobCards.photographerId,
          editorId: jobCards.editorId,
          status: jobCards.status,
          jobStatus: jobCards.jobStatus,
          requestedServices: jobCards.requestedServices,
          editingNotes: jobCards.editingNotes,
          revisionNotes: jobCards.revisionNotes,
          assignedAt: jobCards.assignedAt,
          completedAt: jobCards.completedAt,
          deliveredAt: jobCards.deliveredAt,
          licenseeId: jobCards.licenseeId,
          createdAt: jobCards.createdAt,
          updatedAt: jobCards.updatedAt,
        },
        client: clients,
        photographer: users,
        editor: {
          id: sql`editor.id`,
          email: sql`editor.email`,
          firstName: sql`editor.first_name`,
          lastName: sql`editor.last_name`,
          profileImageUrl: sql`editor.profile_image_url`,
          role: sql`editor.role`,
          licenseeId: sql`editor.licensee_id`,
          createdAt: sql`editor.created_at`,
          updatedAt: sql`editor.updated_at`,
        }
      })
      .from(jobCards)
      .leftJoin(clients, eq(jobCards.clientId, clients.id))
      .leftJoin(users, eq(jobCards.photographerId, users.id))
      .leftJoin(sql`users AS editor`, sql`${jobCards.editorId} = editor.id`)
      .where(and(eq(jobCards.id, id), eq(jobCards.licenseeId, licenseeId)))
      .limit(1);

    if (!result[0]) return undefined;

    return {
      ...result[0].jobCard,
      client: result[0].client!,
      photographer: result[0].photographer,
      editor: result[0].editor.id ? result[0].editor as User : null,
    };
  }

  async createJobCard(jobCard: InsertJobCard): Promise<JobCard> {
    // Generate unique job ID
    const jobId = `JOB-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    const [newJobCard] = await db
      .insert(jobCards)
      .values({ ...jobCard, jobId })
      .returning();
    
    return newJobCard;
  }

  async updateJobCard(id: number, jobCard: Partial<InsertJobCard>, licenseeId: string): Promise<JobCard> {
    const [updatedJobCard] = await db
      .update(jobCards)
      .set({ ...jobCard, updatedAt: new Date() })
      .where(and(eq(jobCards.id, id), eq(jobCards.licenseeId, licenseeId)))
      .returning();
    
    return updatedJobCard;
  }

  async getJobCardsByEditor(editorId: string, licenseeId: string): Promise<(JobCard & { client: Client; photographer: User | null })[]> {
    const results = await db
      .select({
        jobCard: jobCards,
        client: clients,
        photographer: users,
      })
      .from(jobCards)
      .leftJoin(clients, eq(jobCards.clientId, clients.id))
      .leftJoin(users, eq(jobCards.photographerId, users.id))
      .where(and(
        eq(jobCards.editorId, editorId), 
        eq(jobCards.licenseeId, licenseeId)
      ))
      .orderBy(desc(jobCards.createdAt));

    return results.map(result => ({
      ...result.jobCard,
      client: result.client!,
      photographer: result.photographer,
    }));
  }

  async getJobCardsByStatus(status: string, licenseeId: string): Promise<(JobCard & { client: Client; photographer: User | null; editor: User | null })[]> {
    const results = await db
      .select({
        jobCard: jobCards,
        client: clients,
        photographer: users,
        editor: {
          id: sql`editor.id`,
          email: sql`editor.email`,
          firstName: sql`editor.first_name`,
          lastName: sql`editor.last_name`,
          profileImageUrl: sql`editor.profile_image_url`,
          role: sql`editor.role`,
          licenseeId: sql`editor.licensee_id`,
          createdAt: sql`editor.created_at`,
          updatedAt: sql`editor.updated_at`,
        }
      })
      .from(jobCards)
      .leftJoin(clients, eq(jobCards.clientId, clients.id))
      .leftJoin(users, eq(jobCards.photographerId, users.id))
      .leftJoin(sql`users AS editor`, sql`${jobCards.editorId} = editor.id`)
      .where(and(
        sql`${jobCards.status} = ${status}`, 
        eq(jobCards.licenseeId, licenseeId)
      ))
      .orderBy(desc(jobCards.createdAt));

    return results.map(result => ({
      ...result.jobCard,
      client: result.client!,
      photographer: result.photographer,
      editor: result.editor.id ? result.editor as User : null,
    }));
  }

  // Production files operations
  async getProductionFiles(jobCardId: number): Promise<ProductionFile[]> {
    return await db
      .select()
      .from(productionFiles)
      .where(and(
        eq(productionFiles.jobCardId, jobCardId),
        eq(productionFiles.isActive, true)
      ))
      .orderBy(desc(productionFiles.uploadedAt));
  }

  async createProductionFile(file: InsertProductionFile): Promise<ProductionFile> {
    const [newFile] = await db
      .insert(productionFiles)
      .values(file)
      .returning();
    
    return newFile;
  }

  async deleteProductionFile(id: number): Promise<void> {
    await db
      .update(productionFiles)
      .set({ isActive: false })
      .where(eq(productionFiles.id, id));
  }

  async getProductionFilesByType(jobCardId: number, mediaType: string, serviceCategory?: string): Promise<ProductionFile[]> {
    const conditions = [
      eq(productionFiles.jobCardId, jobCardId),
      sql`${productionFiles.mediaType} = ${mediaType}`,
      eq(productionFiles.isActive, true)
    ];
    
    if (serviceCategory) {
      conditions.push(sql`${productionFiles.serviceCategory} = ${serviceCategory}`);
    }

    return await db
      .select()
      .from(productionFiles)
      .where(and(...conditions))
      .orderBy(desc(productionFiles.uploadedAt));
  }

  // Notifications
  async getNotifications(userId: string): Promise<ProductionNotification[]> {
    return await db
      .select()
      .from(productionNotifications)
      .where(eq(productionNotifications.recipientId, userId))
      .orderBy(desc(productionNotifications.createdAt));
  }

  async createNotification(notification: InsertProductionNotification): Promise<ProductionNotification> {
    const [newNotification] = await db
      .insert(productionNotifications)
      .values(notification)
      .returning();
    
    return newNotification;
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db
      .update(productionNotifications)
      .set({ isRead: true })
      .where(eq(productionNotifications.id, id));
  }

  // Calendar Events
  async getCalendarEvents(licenseeId: string, photographerId?: string): Promise<CalendarEvent[]> {
    const whereConditions = [eq(calendarEvents.licenseeId, licenseeId)];
    
    if (photographerId) {
      whereConditions.push(eq(calendarEvents.photographerId, photographerId));
    }

    return await db
      .select()
      .from(calendarEvents)
      .where(and(...whereConditions))
      .orderBy(desc(calendarEvents.start));
  }

  async createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent> {
    const [newEvent] = await db
      .insert(calendarEvents)
      .values(event)
      .returning();
    return newEvent;
  }

  async updateCalendarEvent(id: number, event: Partial<InsertCalendarEvent>): Promise<CalendarEvent> {
    const [updatedEvent] = await db
      .update(calendarEvents)
      .set({ ...event, updatedAt: new Date() })
      .where(eq(calendarEvents.id, id))
      .returning();
    return updatedEvent;
  }

  async deleteCalendarEvent(id: number): Promise<void> {
    await db
      .delete(calendarEvents)
      .where(eq(calendarEvents.id, id));
  }

  // Business Settings
  async getBusinessSettings(licenseeId: string): Promise<BusinessSettings | undefined> {
    const [settings] = await db
      .select()
      .from(businessSettings)
      .where(eq(businessSettings.licenseeId, licenseeId));
    return settings;
  }

  async upsertBusinessSettings(settings: InsertBusinessSettings): Promise<BusinessSettings> {
    const existing = await this.getBusinessSettings(settings.licenseeId);
    
    if (existing) {
      const [updated] = await db
        .update(businessSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(businessSettings.licenseeId, settings.licenseeId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(businessSettings)
        .values(settings)
        .returning();
      return created;
    }
  }

  // Google Calendar Integration
  async getGoogleCalendarIntegration(userId: string): Promise<GoogleCalendarIntegration | undefined> {
    const [integration] = await db
      .select()
      .from(googleCalendarIntegrations)
      .where(and(
        eq(googleCalendarIntegrations.userId, userId),
        eq(googleCalendarIntegrations.isActive, true)
      ));
    return integration;
  }

  async createGoogleCalendarIntegration(integration: InsertGoogleCalendarIntegration): Promise<GoogleCalendarIntegration> {
    const [newIntegration] = await db
      .insert(googleCalendarIntegrations)
      .values(integration)
      .returning();
    return newIntegration;
  }

  async updateGoogleCalendarIntegration(id: number, integration: Partial<InsertGoogleCalendarIntegration>): Promise<GoogleCalendarIntegration> {
    const [updated] = await db
      .update(googleCalendarIntegrations)
      .set({ ...integration, updatedAt: new Date() })
      .where(eq(googleCalendarIntegrations.id, id))
      .returning();
    return updated;
  }

  async deleteGoogleCalendarIntegration(userId: string): Promise<void> {
    await db
      .update(googleCalendarIntegrations)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(googleCalendarIntegrations.userId, userId));
  }

  // Calendar Sync Logs
  async createCalendarSyncLog(log: InsertCalendarSyncLog): Promise<CalendarSyncLog> {
    const [newLog] = await db
      .insert(calendarSyncLogs)
      .values(log)
      .returning();
    return newLog;
  }

  async getCalendarSyncLogByEventId(eventId: string): Promise<CalendarSyncLog | undefined> {
    const [log] = await db
      .select()
      .from(calendarSyncLogs)
      .where(eq(calendarSyncLogs.eventId, eventId))
      .orderBy(desc(calendarSyncLogs.syncedAt))
      .limit(1);
    return log;
  }

  async getCalendarEventByGoogleId(googleEventId: string): Promise<CalendarEvent | undefined> {
    const [log] = await db
      .select()
      .from(calendarSyncLogs)
      .where(eq(calendarSyncLogs.googleEventId, googleEventId));
    
    if (!log || !log.eventId) return undefined;
    
    const [event] = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, parseInt(log.eventId)));
    
    return event;
  }

  // Activity Log operations - placeholder for now, will implement properly once schema is fixed
  async getJobActivityLog(jobCardId: number): Promise<any[]> {
    return [];
  }

  async createJobActivityLog(log: any): Promise<any> {
    return {};
  }

  // Delivery functionality implementations
  async getJobCardDeliverySettings(jobCardId: number): Promise<JobCardDeliverySettings | undefined> {
    const [settings] = await db
      .select()
      .from(jobCardDeliverySettings)
      .where(eq(jobCardDeliverySettings.jobCardId, jobCardId));
    return settings || undefined;
  }

  async createJobCardDeliverySettings(settings: InsertJobCardDeliverySettings): Promise<JobCardDeliverySettings> {
    const [newSettings] = await db
      .insert(jobCardDeliverySettings)
      .values(settings)
      .returning();
    return newSettings;
  }

  async updateJobCardDeliverySettings(jobCardId: number, settings: Partial<InsertJobCardDeliverySettings>): Promise<JobCardDeliverySettings> {
    const [updatedSettings] = await db
      .update(jobCardDeliverySettings)
      .set(settings)
      .where(eq(jobCardDeliverySettings.jobCardId, jobCardId))
      .returning();
    return updatedSettings;
  }

  async getDeliveryComments(jobCardId: number): Promise<DeliveryComment[]> {
    return await db
      .select()
      .from(deliveryComments)
      .where(eq(deliveryComments.jobCardId, jobCardId))
      .orderBy(desc(deliveryComments.createdAt));
  }

  async createDeliveryComment(comment: InsertDeliveryComment): Promise<DeliveryComment> {
    const [newComment] = await db
      .insert(deliveryComments)
      .values(comment)
      .returning();
    
    // If this is a revision request, update job status
    if (comment.requestRevision) {
      await db
        .update(jobCards)
        .set({ status: "in_revision" })
        .where(eq(jobCards.id, comment.jobCardId));
        
      // Log the revision request
      await this.createJobActivityLog({
        jobCardId: comment.jobCardId,
        action: "revision_requested",
        details: `Client requested revision: ${comment.comment}`,
        timestamp: new Date(),
      });
    }
    
    return newComment;
  }

  async updateDeliveryComment(id: number, comment: Partial<InsertDeliveryComment>): Promise<DeliveryComment> {
    const [updatedComment] = await db
      .update(deliveryComments)
      .set(comment)
      .where(eq(deliveryComments.id, id))
      .returning();
    return updatedComment;
  }

  async createDeliveryTracking(tracking: InsertDeliveryTracking): Promise<DeliveryTracking> {
    const [newTracking] = await db
      .insert(deliveryTracking)
      .values(tracking)
      .returning();
    return newTracking;
  }

  async getDeliveryTracking(jobCardId: number): Promise<DeliveryTracking[]> {
    return await db
      .select()
      .from(deliveryTracking)
      .where(eq(deliveryTracking.jobCardId, jobCardId))
      .orderBy(desc(deliveryTracking.timestamp));
  }

  async getJobCardForDelivery(jobCardId: number): Promise<(JobCard & { client: Client; deliverySettings?: JobCardDeliverySettings }) | undefined> {
    const [result] = await db
      .select({
        jobCard: jobCards,
        client: clients,
        deliverySettings: jobCardDeliverySettings,
      })
      .from(jobCards)
      .innerJoin(clients, eq(jobCards.clientId, clients.id))
      .leftJoin(jobCardDeliverySettings, eq(jobCards.id, jobCardDeliverySettings.jobCardId))
      .where(eq(jobCards.id, jobCardId));

    if (!result) return undefined;

    return {
      ...result.jobCard,
      client: result.client,
      deliverySettings: result.deliverySettings || undefined,
    } as JobCard & { client: Client; deliverySettings?: JobCardDeliverySettings };
  }

  async getJobCardByDeliveryUrl(deliveryUrl: string): Promise<(JobCard & { client: Client; deliverySettings?: JobCardDeliverySettings }) | undefined> {
    const [result] = await db
      .select({
        jobCard: jobCards,
        client: clients,
        deliverySettings: jobCardDeliverySettings,
      })
      .from(jobCardDeliverySettings)
      .innerJoin(jobCards, eq(jobCardDeliverySettings.jobCardId, jobCards.id))
      .innerJoin(clients, eq(jobCards.clientId, clients.id))
      .where(eq(jobCardDeliverySettings.deliveryUrl, deliveryUrl));

    if (!result) return undefined;

    return {
      ...result.jobCard,
      client: result.client,
      deliverySettings: result.deliverySettings,
    } as JobCard & { client: Client; deliverySettings?: JobCardDeliverySettings };
  }

  // Product operations
  async getProducts(licenseeId: string): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.licenseeId, licenseeId));
  }

  async getProduct(id: string, licenseeId: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products)
      .where(and(eq(products.id, id), eq(products.licenseeId, licenseeId)));
    return product || undefined;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>, licenseeId: string): Promise<Product> {
    const [updatedProduct] = await db.update(products)
      .set({ ...product, updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.licenseeId, licenseeId)))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: string, licenseeId: string): Promise<void> {
    await db.delete(products)
      .where(and(eq(products.id, id), eq(products.licenseeId, licenseeId)));
  }

  // Order Status Audit operations
  async createOrderStatusAudit(audit: InsertOrderStatusAudit): Promise<OrderStatusAudit> {
    const [newAudit] = await db
      .insert(orderStatusAudit)
      .values(audit)
      .returning();
    return newAudit;
  }

  async getOrderStatusAuditLog(jobCardId: number): Promise<OrderStatusAudit[]> {
    return await db
      .select()
      .from(orderStatusAudit)
      .where(eq(orderStatusAudit.jobCardId, jobCardId))
      .orderBy(desc(orderStatusAudit.createdAt));
  }

  // Email Delivery Log operations
  async createEmailDeliveryLog(log: InsertEmailDeliveryLog): Promise<EmailDeliveryLog> {
    const [newLog] = await db
      .insert(emailDeliveryLog)
      .values(log)
      .returning();
    return newLog;
  }

  async getEmailDeliveryLogs(jobCardId: number): Promise<EmailDeliveryLog[]> {
    return await db
      .select()
      .from(emailDeliveryLog)
      .where(eq(emailDeliveryLog.jobCardId, jobCardId))
      .orderBy(desc(emailDeliveryLog.createdAt));
  }

  // Enhanced job card operations for order status
  async updateJobCardStatus(id: number, status: string, changedBy: string, reason?: string): Promise<JobCard> {
    // First get the current job card to record the old status
    const [currentJobCard] = await db
      .select()
      .from(jobCards)
      .where(eq(jobCards.id, id));

    if (!currentJobCard) {
      throw new Error("Job card not found");
    }

    // Update the job card status
    const [updated] = await db
      .update(jobCards)
      .set({ 
        status: status as any, 
        updatedAt: new Date(),
        ...(status === "complete" && { completedAt: new Date() }),
        ...(status === "delivered" && { deliveredAt: new Date() })
      })
      .where(eq(jobCards.id, id))
      .returning();

    // Create audit log entry
    await this.createOrderStatusAudit({
      jobCardId: id,
      previousStatus: currentJobCard.status,
      newStatus: status,
      changedBy,
      changeReason: reason,
      metadata: { timestamp: new Date().toISOString() }
    });

    return updated;
  }

  async sendDeliveryEmail(jobCardId: number, recipientEmail: string): Promise<EmailDeliveryLog> {
    // Create email delivery log
    const emailLog = await this.createEmailDeliveryLog({
      jobCardId,
      recipientEmail,
      emailType: "delivery_notification",
      emailStatus: "sent",
      deliveredAt: new Date()
    });

    // Update job card status to delivered
    await this.updateJobCardStatus(jobCardId, "delivered", "system", "Delivery email sent to client");

    return emailLog;
  }

  async getJobCardWithClient(jobCardId: number): Promise<(JobCard & { client: Client }) | undefined> {
    const [result] = await db
      .select({
        jobCard: jobCards,
        client: clients,
      })
      .from(jobCards)
      .innerJoin(clients, eq(jobCards.clientId, clients.id))
      .where(eq(jobCards.id, jobCardId));

    if (!result) return undefined;

    return {
      ...result.jobCard,
      client: result.client,
    } as JobCard & { client: Client };
  }
}

export const storage = new DatabaseStorage();
