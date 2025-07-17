import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertClientSchema, 
  insertOfficeSchema,
  insertBookingSchema, 
  insertCommunicationSchema,
  insertJobCardSchema,
  insertProductionFileSchema,
  insertProductionNotificationSchema,
  insertCalendarEventSchema,
  insertBusinessSettingsSchema,
  insertGoogleCalendarIntegrationSchema,
  insertProductSchema,
  insertOrderStatusAuditSchema,
  insertEmailDeliveryLogSchema,
  insertEditorServiceCategorySchema,
  insertEditorServiceOptionSchema,
  insertServiceTemplateSchema
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import { fileStorage } from "./fileStorage";
import { requireEditor, requireAdmin, requireVA, requireAdminOrVA, requireProductionStaff } from "./middleware/roleAuth";
import { googleCalendarService } from "./googleCalendar";
import { s3Service } from "./services/s3Service";
import { thumbnailService } from "./services/thumbnailService";
import { db } from "./db";
import { jobCards, clients } from "@shared/schema";
import { eq } from "drizzle-orm";
import archiver from "archiver";
import { Readable } from "stream";

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB limit for professional photography
  },
  fileFilter: (req, file, cb) => {
    // Accept images (including DNG/RAW) and videos
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/tiff', 'image/gif',
      'image/x-adobe-dng', 'image/x-canon-cr2', 'image/x-canon-crw',
      'image/x-nikon-nef', 'image/x-sony-arw', 'image/x-panasonic-raw',
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv'
    ];
    
    if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Helper function to create or update content items
  async function createOrUpdateContentItem(jobCardId: number, serviceCategory: string, userId: string, thumbnailKey?: string | null) {
    try {
      // Get existing content items for this job and category
      const existingItems = await storage.getContentItems(jobCardId, serviceCategory);
      
      // Generate content item name based on category
      const categoryDisplayName = serviceCategory === 'photography' ? 'Images' : 
                                  serviceCategory === 'floor_plan' ? 'Floor Plans' :
                                  serviceCategory === 'drone' ? 'Drone' :
                                  serviceCategory === 'video' ? 'Video' :
                                  'Other';
      
      // Get files for this category - only finished/final files
      const files = await storage.getProductionFiles(jobCardId);
      const categoryFiles = files.filter(f => f.serviceCategory === serviceCategory && (f.mediaType === 'finished' || f.mediaType === 'final'));
      
      if (existingItems.length === 0) {
        // Generate unique content ID for this content item
        const contentId = await storage.generateContentId();
        const itemName = `#${contentId} ${categoryDisplayName} ON`;
        
        // Create new content item
        const contentItem = {
          jobCardId,
          contentId,
          category: serviceCategory,
          name: itemName,
          description: `${categoryDisplayName} for content ID ${contentId}`,
          fileCount: categoryFiles.length,
          s3Urls: categoryFiles.map(f => f.s3Key).filter(Boolean),
          thumbUrl: thumbnailKey,
          status: 'draft',
          uploaderRole: 'editor', // Flag editor uploads
          type: 'finished', // Flag as finished content
          createdBy: userId,
          updatedBy: userId,
        };
        
        await storage.createContentItem(contentItem);
        console.log(`Created content item for job ${jobCardId}, category ${serviceCategory}, content ID: ${contentId}`);
      } else {
        // Update existing content item
        const item = existingItems[0];
        const updateData: any = {
          fileCount: categoryFiles.length,
          s3Urls: categoryFiles.map(f => f.s3Key).filter(Boolean),
          updatedBy: userId,
        };
        
        // Update thumbnail if provided
        if (thumbnailKey) {
          updateData.thumbUrl = thumbnailKey;
        }
        
        await storage.updateContentItem(item.id, updateData);
        console.log(`Updated content item for job ${jobCardId}, category ${serviceCategory}`);
      }
    } catch (error) {
      console.error('Error creating/updating content item:', error);
    }
  }

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Office routes
  app.get('/api/offices', isAuthenticated, async (req: any, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      const offices = await storage.getOffices(licenseeId);
      res.json(offices);
    } catch (error) {
      console.error("Error fetching offices:", error);
      res.status(500).json({ message: "Failed to fetch offices" });
    }
  });

  app.get('/api/offices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      const officeId = parseInt(req.params.id);
      const office = await storage.getOffice(officeId, licenseeId);
      if (!office) {
        return res.status(404).json({ message: "Office not found" });
      }
      res.json(office);
    } catch (error) {
      console.error("Error fetching office:", error);
      res.status(500).json({ message: "Failed to fetch office" });
    }
  });

  app.post('/api/offices', isAuthenticated, async (req: any, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      const officeData = insertOfficeSchema.parse({
        ...req.body,
        licenseeId,
      });
      const office = await storage.createOffice(officeData);
      res.status(201).json(office);
    } catch (error) {
      console.error("Error creating office:", error);
      res.status(400).json({ message: "Failed to create office" });
    }
  });

  app.put('/api/offices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      const officeId = parseInt(req.params.id);
      const officeData = insertOfficeSchema.partial().parse(req.body);
      const office = await storage.updateOffice(officeId, officeData, licenseeId);
      res.json(office);
    } catch (error) {
      console.error("Error updating office:", error);
      res.status(400).json({ message: "Failed to update office" });
    }
  });

  app.delete('/api/offices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      const officeId = parseInt(req.params.id);
      await storage.deleteOffice(officeId, licenseeId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting office:", error);
      res.status(500).json({ message: "Failed to delete office" });
    }
  });

  // Client routes
  app.get('/api/clients', isAuthenticated, async (req: any, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      const clients = await storage.getClients(licenseeId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get('/api/clients/:id', isAuthenticated, async (req: any, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      const clientId = parseInt(req.params.id);
      const client = await storage.getClient(clientId, licenseeId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post('/api/clients', isAuthenticated, async (req: any, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      const clientData = insertClientSchema.parse({
        ...req.body,
        licenseeId,
      });
      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(400).json({ message: "Failed to create client" });
    }
  });

  app.put('/api/clients/:id', isAuthenticated, async (req: any, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      const clientId = parseInt(req.params.id);
      const clientData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(clientId, clientData, licenseeId);
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(400).json({ message: "Failed to update client" });
    }
  });

  app.delete('/api/clients/:id', isAuthenticated, async (req: any, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      const clientId = parseInt(req.params.id);
      await storage.deleteClient(clientId, licenseeId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Booking routes
  app.get('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      const bookings = await storage.getBookings(licenseeId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.get('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      const bookingId = parseInt(req.params.id);
      const booking = await storage.getBooking(bookingId, licenseeId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      console.error("Error fetching booking:", error);
      res.status(500).json({ message: "Failed to fetch booking" });
    }
  });

  app.post('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      console.log("Received booking data:", req.body);
      
      const bookingData = insertBookingSchema.parse({
        ...req.body,
        licenseeId,
      });
      
      console.log("Parsed booking data:", bookingData);
      
      const booking = await storage.createBooking(bookingData);
      res.status(201).json(booking);
    } catch (error) {
      console.error("Error creating booking:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        res.status(400).json({ 
          message: "Validation failed",
          errors: error.errors 
        });
      } else {
        res.status(400).json({ message: "Failed to create booking" });
      }
    }
  });

  app.put('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      const bookingId = parseInt(req.params.id);
      const bookingData = insertBookingSchema.partial().parse(req.body);
      const booking = await storage.updateBooking(bookingId, bookingData, licenseeId);
      res.json(booking);
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(400).json({ message: "Failed to update booking" });
    }
  });

  app.delete('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      const bookingId = parseInt(req.params.id);
      await storage.deleteBooking(bookingId, licenseeId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting booking:", error);
      res.status(500).json({ message: "Failed to delete booking" });
    }
  });

  // Media file routes
  app.get('/api/bookings/:id/media', isAuthenticated, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const mediaFiles = await storage.getMediaFiles(bookingId);
      res.json(mediaFiles);
    } catch (error) {
      console.error("Error fetching media files:", error);
      res.status(500).json({ message: "Failed to fetch media files" });
    }
  });

  // QA checklist routes
  app.get('/api/bookings/:id/qa', isAuthenticated, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const qaChecklist = await storage.getQaChecklist(bookingId);
      res.json(qaChecklist);
    } catch (error) {
      console.error("Error fetching QA checklist:", error);
      res.status(500).json({ message: "Failed to fetch QA checklist" });
    }
  });

  // Communication routes
  app.get('/api/clients/:id/communications', isAuthenticated, async (req: any, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const communications = await storage.getCommunications(clientId);
      res.json(communications);
    } catch (error) {
      console.error("Error fetching communications:", error);
      res.status(500).json({ message: "Failed to fetch communications" });
    }
  });

  app.post('/api/clients/:id/communications', isAuthenticated, async (req: any, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const communicationData = insertCommunicationSchema.parse({
        ...req.body,
        clientId,
        userId,
      });
      const communication = await storage.createCommunication(communicationData);
      res.status(201).json(communication);
    } catch (error) {
      console.error("Error creating communication:", error);
      res.status(400).json({ message: "Failed to create communication" });
    }
  });

  // Dashboard statistics
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      const stats = await storage.getDashboardStats(licenseeId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Photographers
  app.get('/api/photographers', isAuthenticated, async (req: any, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      const photographers = await storage.getPhotographers(licenseeId);
      res.json(photographers);
    } catch (error) {
      console.error("Error fetching photographers:", error);
      res.status(500).json({ message: "Failed to fetch photographers" });
    }
  });

  // Editors
  app.get('/api/editors', isAuthenticated, async (req: any, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      const editors = await storage.getEditors(licenseeId);
      res.json(editors);
    } catch (error) {
      console.error("Error fetching editors:", error);
      res.status(500).json({ message: "Failed to fetch editors" });
    }
  });

  // Jobs API (user-facing jobs management)
  app.get("/api/jobs", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      console.log("User object:", req.user);
      const userId = req.user!.id || req.user!.claims?.sub;
      console.log("Fetching jobs for licensee:", userId);
      const jobCards = await storage.getJobCards(userId);
      console.log("Found job cards:", jobCards.length);
      
      // Enhance job cards with booking details for the jobs page
      const jobsWithBookings = await Promise.all(
        jobCards.map(async (jobCard) => {
          const booking = await storage.getBooking(jobCard.bookingId, userId);
          console.log(`Job card ${jobCard.id} booking:`, booking);
          return {
            ...jobCard,
            booking: booking || {
              id: jobCard.bookingId,
              propertyAddress: "Unknown Address", 
              scheduledDate: new Date().toISOString(),
              scheduledTime: "09:00",
              services: [],
              totalPrice: 0
            }
          };
        })
      );
      
      console.log("Returning jobs with bookings:", jobsWithBookings.length);
      res.json(jobsWithBookings);
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.get("/api/jobs/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = req.user!.id || req.user!.claims?.sub;
      const jobCard = await storage.getJobCard(jobId, userId);
      
      if (!jobCard) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Get booking details
      const booking = await storage.getBooking(jobCard.bookingId, userId);
      
      res.json({
        ...jobCard,
        booking: booking || {
          id: jobCard.bookingId,
          propertyAddress: "Unknown Address",
          scheduledDate: new Date().toISOString(), 
          scheduledTime: "09:00",
          services: [],
          totalPrice: 0
        }
      });
    } catch (error) {
      console.error("Failed to fetch job:", error);
      res.status(500).json({ message: "Failed to fetch job" });
    }
  });

  app.get("/api/jobs/:id/files", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const files = await storage.getProductionFiles(jobId);
      res.json(files);
    } catch (error) {
      console.error("Failed to fetch job files:", error);
      res.status(500).json({ message: "Failed to fetch job files" });
    }
  });

  app.get("/api/jobs/:id/activity", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const activityLog = await storage.getJobActivityLog(jobId);
      res.json(activityLog);
    } catch (error) {
      console.error("Failed to fetch job activity:", error);
      res.status(500).json({ message: "Failed to fetch job activity" });
    }
  });

  // Job Cards routes (admin/licensee access)
  app.get('/api/job-cards', isAuthenticated, async (req: any, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      const { status, editorId, include_details } = req.query;
      
      let jobCards;
      if (status) {
        jobCards = await storage.getJobCardsByStatus(status as string, licenseeId);
      } else if (editorId) {
        jobCards = await storage.getJobCardsByEditor(editorId as string, licenseeId);
      } else {
        jobCards = await storage.getJobCards(licenseeId);
      }

      // If include_details is requested, enhance with client and booking information
      if (include_details === 'true') {
        const enhancedJobCards = await Promise.all(
          jobCards.map(async (jobCard) => {
            const client = await storage.getClient(jobCard.clientId, licenseeId);
            const booking = await storage.getBooking(jobCard.bookingId, licenseeId);
            return {
              ...jobCard,
              client: client || { 
                id: jobCard.clientId, 
                name: "Unknown Client", 
                email: "", 
                contactName: "" 
              },
              booking: booking || { 
                id: jobCard.bookingId, 
                propertyAddress: "Unknown Address",
                price: "0.00",
                scheduledDate: new Date().toISOString().split('T')[0],
                scheduledTime: "09:00"
              }
            };
          })
        );
        res.json(enhancedJobCards);
      } else {
        res.json(jobCards);
      }
    } catch (error) {
      console.error("Error fetching job cards:", error);
      res.status(500).json({ message: "Failed to fetch job cards" });
    }
  });

  // Editor-specific job cards route
  app.get('/api/editor/job-cards', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userData = (req as any).userData;
      
      // Get user info from database to determine role
      const userFromDB = await storage.getUser(userId);
      const userRole = userFromDB?.role || 'admin';
      
      // Determine licenseeId based on user role
      const licenseeId = userRole === 'editor' ? (userFromDB?.licenseeId || userId) : userId;
      
      console.log('Editor job cards fetch - userId:', userId, 'userRole:', userRole, 'licenseeId:', licenseeId, 'userData:', userData);
      
      let jobCards;
      if (userRole === 'editor') {
        // For editors, show only their assigned jobs
        jobCards = await storage.getJobCardsByEditor(userId, licenseeId);
      } else {
        // For admins/licensees, show all jobs with assigned editors
        jobCards = await storage.getJobCards(licenseeId);
        // Filter to only show jobs that have been assigned to an editor
        jobCards = jobCards.filter(job => job.editorId !== null);
      }
      
      console.log('Editor job cards fetched:', jobCards.length, 'jobs found');
      console.log('Job cards:', jobCards.map(j => ({ id: j.id, jobId: j.jobId, editorId: j.editorId, status: j.status })));
      
      res.json(jobCards);
    } catch (error) {
      console.error("Error fetching editor job cards:", error);
      res.status(500).json({ message: "Failed to fetch job cards" });
    }
  });

  // Editor jobs with details route
  app.get('/api/editor/jobs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userData = (req as any).userData;
      
      console.log('Editor jobs endpoint - userId:', userId, 'userData:', userData);
      
      // Determine licenseeId based on user role
      const licenseeId = userData?.role === 'editor' ? userData.licenseeId : userId;
      
      let jobCards;
      if (userData?.role === 'editor') {
        // For editors, show only their assigned jobs
        jobCards = await storage.getJobCardsByEditor(userId, licenseeId);
      } else {
        // For admins/licensees, show all jobs with assigned editors
        jobCards = await storage.getJobCards(licenseeId);
        // Filter to only show jobs that have been assigned to an editor
        jobCards = jobCards.filter(job => job.editorId !== null);
      }
      
      // Enhance with client and booking information
      const enhancedJobCards = await Promise.all(
        jobCards.map(async (jobCard) => {
          const client = await storage.getClient(jobCard.clientId, licenseeId);
          const booking = await storage.getBooking(jobCard.bookingId, licenseeId);
          const files = await storage.getJobCardFiles(jobCard.id);
          
          return {
            ...jobCard,
            client: client || { 
              id: jobCard.clientId, 
              name: "Unknown Client", 
              email: "", 
              contactName: "" 
            },
            booking: booking || { 
              id: jobCard.bookingId, 
              propertyAddress: "Unknown Address",
              price: "0.00",
              scheduledDate: new Date().toISOString().split('T')[0],
              scheduledTime: "09:00"
            },
            files: files || []
          };
        })
      );
      
      res.json(enhancedJobCards);
    } catch (error) {
      console.error("Error fetching editor jobs:", error);
      res.status(500).json({ message: "Failed to fetch editor jobs" });
    }
  });

  app.get('/api/job-cards/:id', isAuthenticated, async (req: any, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      const jobCardId = parseInt(req.params.id);
      const jobCard = await storage.getJobCard(jobCardId, licenseeId);
      if (!jobCard) {
        return res.status(404).json({ message: "Job card not found" });
      }
      res.json(jobCard);
    } catch (error) {
      console.error("Error fetching job card:", error);
      res.status(500).json({ message: "Failed to fetch job card" });
    }
  });

  app.put('/api/job-cards/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userData = (req as any).userData;
      const jobCardId = parseInt(req.params.id);
      const updateData = req.body;
      
      // Determine licenseeId based on user role
      const licenseeId = userData?.role === 'editor' ? userData.licenseeId : userId;
      
      // For editors, only allow certain status updates
      if (userData?.role === 'editor') {
        const allowedStatuses = ['in_progress', 'editing', 'ready_for_qa'];
        if (updateData.status && !allowedStatuses.includes(updateData.status)) {
          return res.status(403).json({ message: "Editors cannot set this status" });
        }
        
        // Ensure editor can only update their own jobs
        const jobCard = await storage.getJobCard(jobCardId, licenseeId);
        if (!jobCard || jobCard.editorId !== userId) {
          return res.status(403).json({ message: "Cannot update job not assigned to you" });
        }
      }
      
      // Handle status updates with automatic timestamp setting
      if (updateData.status) {
        if (updateData.status === 'in_progress' && !updateData.assignedAt) {
          updateData.assignedAt = new Date();
        }
        if (updateData.status === 'delivered' && !updateData.deliveredAt) {
          updateData.deliveredAt = new Date();
        }
        if (['ready_for_qc', 'editing'].includes(updateData.status) && !updateData.completedAt) {
          updateData.completedAt = new Date();
        }
      }
      
      // Automatically assign Job ID when editor is assigned for the first time
      if (updateData.editorId && updateData.status === 'in_progress') {
        const hasJobId = await storage.hasJobId(jobCardId);
        if (!hasJobId) {
          await storage.assignJobId(jobCardId);
        }
      }
      
      const jobCard = await storage.updateJobCard(jobCardId, updateData, licenseeId);
      
      // Create notification for status changes
      if (updateData.status && updateData.editorId) {
        const notificationData = insertProductionNotificationSchema.parse({
          jobCardId,
          recipientId: updateData.editorId,
          type: 'assignment',
          message: `Job card ${jobCard.jobId} has been assigned to you`,
        });
        await storage.createNotification(notificationData);
      }
      
      res.json(jobCard);
    } catch (error) {
      console.error("Error updating job card:", error);
      res.status(400).json({ message: "Failed to update job card" });
    }
  });

  // Complete job with content piece creation
  app.post("/api/job-cards/:id/complete-with-content", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { notes, instructionsFollowed, qcIssues, completionDetails } = req.body;
      const userId = req.user.claims.sub;
      const userData = (req as any).userData;
      const licenseeId = userData?.role === 'editor' ? userData.licenseeId : userId;
      const editorName = `${req.user.claims.firstName || ''} ${req.user.claims.lastName || ''}`.trim();
      
      const jobCardId = parseInt(id);
      
      // Get job card details
      const jobCard = await storage.getJobCard(jobCardId, licenseeId);
      if (!jobCard) {
        return res.status(404).json({ error: "Job card not found" });
      }
      
      // Get final files for this job
      const allFiles = await storage.getProductionFiles(jobCardId);
      const finalFiles = allFiles.filter(file => file.mediaType === "final");
      
      // Calculate final cost from service pricing
      let finalCost = 0;
      for (const file of finalFiles) {
        // Base cost per file - in real system this would use service pricing
        finalCost += 25;
      }
      
      // Update job card status
      const updateData = {
        status: "ready_for_qc",
        completedAt: new Date(),
        editingNotes: notes,
        updatedAt: new Date(),
      };
      
      await storage.updateJobCard(jobCardId, updateData, licenseeId);
      
      // Create comprehensive activity log entry
      const activityData = {
        jobCardId,
        userId,
        action: "job_completed_with_content",
        description: `Job completed by ${editorName}. Created ${finalFiles.length} content pieces with total cost of $${finalCost.toFixed(2)}. All client instructions followed and ready for delivery.`,
        metadata: {
          editorName,
          editorId: userId,
          finalCost,
          contentPiecesCreated: finalFiles.length,
          instructionsFollowed,
          qcIssues,
          deliveryTimestamp: new Date().toISOString(),
          completionDetails,
          serviceBreakdown: finalFiles.map(f => ({
            fileName: f.fileName,
            serviceCategory: f.serviceCategory,
            cost: finalCost / finalFiles.length
          }))
        }
      };
      
      await storage.createJobActivityLog(activityData);
      
      // Send notification about completion
      const notificationData = {
        jobCardId,
        recipientId: licenseeId,
        type: "completion",
        message: `Job ${jobCard.jobId} completed by ${editorName}. ${finalFiles.length} content pieces created and ready for delivery. Final cost: $${finalCost.toFixed(2)}`,
        isRead: false,
        createdAt: new Date(),
      };
      
      await storage.createNotification(notificationData);
      
      res.json({
        success: true,
        message: "Job completed successfully with content pieces created",
        finalCost,
        contentPiecesCreated: finalFiles.length,
        jobStatus: "ready_for_qc"
      });
    } catch (error) {
      console.error("Error completing job with content:", error);
      res.status(500).json({ error: "Failed to complete job with content creation" });
    }
  });

  // Job ID management routes
  app.post('/api/job-cards/:id/assign-job-id', isAuthenticated, async (req: any, res) => {
    try {
      const jobCardId = parseInt(req.params.id);
      const userData = (req as any).userData;
      const licenseeId = userData.licenseeId;
      
      // Verify job card exists and belongs to licensee
      const jobCard = await storage.getJobCard(jobCardId, licenseeId);
      if (!jobCard) {
        return res.status(404).json({ message: "Job card not found" });
      }
      
      const jobId = await storage.assignJobId(jobCardId);
      res.json({ jobId, message: "Job ID assigned successfully" });
    } catch (error) {
      console.error("Error assigning Job ID:", error);
      res.status(500).json({ message: "Failed to assign Job ID" });
    }
  });

  app.get('/api/job-cards/:id/has-job-id', isAuthenticated, async (req: any, res) => {
    try {
      const jobCardId = parseInt(req.params.id);
      const hasJobId = await storage.hasJobId(jobCardId);
      res.json({ hasJobId });
    } catch (error) {
      console.error("Error checking Job ID:", error);
      res.status(500).json({ message: "Failed to check Job ID" });
    }
  });

  // Order status lifecycle management endpoints
  app.post("/api/job-cards/:id/status-change", isAuthenticated, async (req: any, res) => {
    try {
      const jobCardId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { newStatus, notes } = req.body;
      
      // Validate status transition
      const validStatuses = ["pending", "in_progress", "ready_for_qc", "in_revision", "delivered"];
      if (!validStatuses.includes(newStatus)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      // Get current job card
      const jobCard = await storage.getJobCard(jobCardId);
      if (!jobCard) {
        return res.status(404).json({ message: "Job card not found" });
      }

      const oldStatus = jobCard.status;
      
      // Update job card status
      await storage.updateJobCard(jobCardId, { status: newStatus });
      
      // Create activity log entry
      const activityData = {
        jobCardId,
        userId,
        action: `status_change_${newStatus}`,
        description: `Status changed from ${oldStatus} to ${newStatus}${notes ? ` - ${notes}` : ''}`,
        metadata: {
          oldStatus, 
          newStatus, 
          notes,
          timestamp: new Date().toISOString()
        }
      };
      
      await storage.createJobActivityLog(activityData);
      
      // Send notification if needed
      if (newStatus === "ready_for_qc" && jobCard.editorId) {
        await storage.createNotification({
          jobCardId,
          recipientId: jobCard.editorId,
          type: "status_change",
          message: `Job ${jobCard.jobId || `#${jobCard.id}`} is ready for QC`
        });
      }
      
      res.json({ 
        success: true, 
        jobCard: await storage.getJobCard(jobCardId),
        message: `Status updated to ${newStatus}` 
      });
    } catch (error) {
      console.error("Error updating job status:", error);
      res.status(500).json({ message: "Failed to update job status" });
    }
  });

  // Editor action: Accept job
  app.post("/api/job-cards/:id/accept", isAuthenticated, async (req: any, res) => {
    try {
      const jobCardId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Update job card status to in_progress
      await storage.updateJobCard(jobCardId, { 
        status: "in_progress",
        editorId: userId,
        assignedAt: new Date()
      });
      
      // Create activity log entry
      const activityData = {
        jobCardId,
        userId,
        action: "job_accepted",
        description: "Job accepted by editor and moved to In Progress",
        metadata: {
          action: "accept",
          timestamp: new Date().toISOString()
        }
      };
      
      await storage.createJobActivityLog(activityData);
      
      res.json({ 
        success: true, 
        message: "Job accepted successfully" 
      });
    } catch (error) {
      console.error("Error accepting job:", error);
      res.status(500).json({ message: "Failed to accept job" });
    }
  });

  // Editor action: Mark ready for QC
  app.post("/api/job-cards/:id/mark-ready-qc", isAuthenticated, async (req: any, res) => {
    try {
      const jobCardId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { notes } = req.body;
      
      // Update job card status to ready_for_qc
      await storage.updateJobCard(jobCardId, { 
        status: "ready_for_qc"
      });
      
      // Create activity log entry
      const activityData = {
        jobCardId,
        userId,
        action: "ready_for_qc",
        description: `Job marked as ready for QC${notes ? ` - ${notes}` : ''}`,
        metadata: {
          action: "ready_for_qc",
          notes,
          timestamp: new Date().toISOString()
        }
      };
      
      await storage.createJobActivityLog(activityData);
      
      res.json({ 
        success: true, 
        message: "Job marked as ready for QC" 
      });
    } catch (error) {
      console.error("Error marking job ready for QC:", error);
      res.status(500).json({ message: "Failed to mark job ready for QC" });
    }
  });

  // QC action: Request revision
  app.post("/api/job-cards/:id/request-revision", isAuthenticated, async (req: any, res) => {
    try {
      const jobCardId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { notes } = req.body;
      
      // Update job card status to in_revision
      await storage.updateJobCard(jobCardId, { 
        status: "in_revision",
        revisionNotes: notes
      });
      
      // Create activity log entry
      const activityData = {
        jobCardId,
        userId,
        action: "revision_requested",
        description: `Revision requested: ${notes || 'No additional notes'}`,
        metadata: {
          action: "revision",
          notes,
          timestamp: new Date().toISOString()
        }
      };
      
      await storage.createJobActivityLog(activityData);
      
      // Notify editor
      const jobCard = await storage.getJobCard(jobCardId);
      if (jobCard?.editorId) {
        await storage.createNotification({
          jobCardId,
          recipientId: jobCard.editorId,
          type: "revision_requested",
          message: `Revision requested for Job ${jobCard.jobId || `#${jobCard.id}`}`
        });
      }
      
      res.json({ 
        success: true, 
        message: "Revision requested successfully" 
      });
    } catch (error) {
      console.error("Error requesting revision:", error);
      res.status(500).json({ message: "Failed to request revision" });
    }
  });

  // Final action: Deliver job
  app.post("/api/job-cards/:id/deliver", isAuthenticated, async (req: any, res) => {
    try {
      const jobCardId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { notes } = req.body;
      
      // Update job card status to delivered
      await storage.updateJobCard(jobCardId, { 
        status: "delivered",
        deliveredAt: new Date()
      });
      
      // Create activity log entry
      const activityData = {
        jobCardId,
        userId,
        action: "delivered",
        description: `Job delivered to client${notes ? ` - ${notes}` : ''}`,
        metadata: {
          action: "delivered",
          notes,
          timestamp: new Date().toISOString()
        }
      };
      
      await storage.createJobActivityLog(activityData);
      
      res.json({ 
        success: true, 
        message: "Job delivered successfully" 
      });
    } catch (error) {
      console.error("Error delivering job:", error);
      res.status(500).json({ message: "Failed to deliver job" });
    }
  });

  // Comprehensive Editor Submission Endpoint
  app.post('/api/job-cards/:id/submit-to-editor', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userData = (req as any).userData;
      const jobCardId = parseInt(req.params.id);
      const { editorId, serviceBlocks, instructions } = req.body;
      
      // Determine licenseeId based on user role
      const licenseeId = userData?.role === 'editor' ? userData.licenseeId : userId;
      
      // Verify job card exists and belongs to licensee
      const jobCard = await storage.getJobCard(jobCardId, licenseeId);
      if (!jobCard) {
        return res.status(404).json({ message: "Job card not found" });
      }
      
      // Step 1: Assign Job ID if not already assigned
      let jobId = jobCard.jobId;
      if (!jobId) {
        jobId = await storage.assignJobId(jobCardId);
      }
      
      // Step 2: Calculate estimated cost from service blocks
      let totalEstimatedCost = 0;
      const serviceDetails = serviceBlocks.map((block: any) => {
        const blockCost = (block.selectedOptionPrice || 0) * (block.quantity || 1);
        totalEstimatedCost += blockCost;
        return {
          serviceName: block.serviceName,
          optionName: block.selectedOptionName,
          price: block.selectedOptionPrice,
          quantity: block.quantity,
          cost: blockCost,
          fileCount: block.fileCount
        };
      });
      
      // Step 3: Update job card with editor assignment and status
      await storage.updateJobCard(jobCardId, {
        editorId: editorId,
        status: "pending", // Start as pending, editor will accept to move to in_progress
        editingNotes: instructions,
        assignedAt: new Date()
      }, licenseeId);
      
      console.log('Submit to editor - Updated job card:', {
        jobCardId,
        editorId,
        licenseeId,
        status: "pending",
        jobId
      });
      
      // Step 4: Get editor information for logging
      const editor = await storage.getUser(editorId);
      const editorName = editor ? `${editor.firstName} ${editor.lastName}` : editorId;
      
      // Step 5: Create comprehensive activity log entry
      const activityDescription = `Job submitted to editor ${editorName}. Job ID: ${jobId}. ` +
        `Services: ${serviceDetails.map(s => `${s.serviceName} (${s.optionName}: $${s.price} x ${s.quantity})`).join(', ')}. ` +
        `Total estimated cost: $${totalEstimatedCost.toFixed(2)}. ` +
        `Instructions: ${instructions || 'None'}`;
      
      await storage.createJobActivityLog({
        jobCardId: jobCardId,
        userId: userId,
        action: "submitted_to_editor",
        description: activityDescription,
        metadata: {
          jobId: jobId,
          editorId: editorId,
          editorName: editorName,
          serviceBlocks: serviceDetails,
          totalEstimatedCost: totalEstimatedCost,
          instructions: instructions,
          submissionTime: new Date().toISOString()
        }
      });
      
      // Step 6: Create notification for the editor
      const notificationData = {
        jobCardId,
        recipientId: editorId,
        type: 'assignment',
        message: `New job assigned: Job ID ${jobId} with ${serviceBlocks.length} service(s). Estimated value: $${totalEstimatedCost.toFixed(2)}`,
      };
      await storage.createNotification(notificationData);
      
      res.json({ 
        success: true,
        jobId: jobId,
        estimatedCost: totalEstimatedCost,
        serviceCount: serviceBlocks.length,
        message: `Job ${jobId} successfully submitted to ${editorName}`
      });
      
    } catch (error) {
      console.error("Error submitting job to editor:", error);
      res.status(500).json({ message: "Failed to submit job to editor" });
    }
  });

  app.get('/api/admin/job-id-counter', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const currentCounter = await storage.getCurrentJobIdCounter();
      res.json({ currentCounter });
    } catch (error) {
      console.error("Error fetching Job ID counter:", error);
      res.status(500).json({ message: "Failed to fetch Job ID counter" });
    }
  });

  // Action-based job card management - NEW SYSTEM
  app.post('/api/job-cards/:id/actions/:action', isAuthenticated, async (req: any, res) => {
    try {
      const jobCardId = parseInt(req.params.id);
      const { action } = req.params;
      const { notes } = req.body;
      const userId = req.user.claims.sub;
      const userData = (req as any).userData;
      
      // Get current job card
      const jobCard = await storage.getJobCard(jobCardId, userId);
      if (!jobCard) {
        return res.status(404).json({ message: "Job card not found" });
      }

      const now = new Date();
      let updateData: any = { updatedAt: now };
      let activityDescription = "";

      // Handle different actions with role-based permissions
      switch (action) {
        case "upload":
          updateData.uploadedAt = now;
          updateData.status = "pending"; // Auto-set to pending after upload
          activityDescription = "Files uploaded - job ready for assignment";
          break;
        
        case "accept":
          // Only editors can accept jobs
          if (userData?.role !== "editor") {
            return res.status(403).json({ message: "Only editors can accept jobs" });
          }
          updateData.acceptedAt = now;
          updateData.editorId = userId;
          updateData.status = "in_progress"; // Auto-set to in_progress when accepted
          activityDescription = "Job accepted by editor";
          break;
        
        case "readyForQC":
          // Only editors can mark ready for QC
          if (userData?.role !== "editor") {
            return res.status(403).json({ message: "Only editors can mark jobs ready for QC" });
          }
          updateData.readyForQCAt = now;
          updateData.status = "ready_for_qc"; // Auto-set to ready_for_qc
          activityDescription = "Edits completed - ready for quality check";
          break;
        
        case "revision":
          // Only admin/photographer can request revisions
          if (!["admin", "licensee", "photographer"].includes(userData?.role)) {
            return res.status(403).json({ message: "Insufficient permissions to request revisions" });
          }
          updateData.revisionRequestedAt = now;
          updateData.revisionNotes = notes;
          updateData.status = "in_revision"; // Auto-set to in_revision
          activityDescription = `Revision requested${notes ? `: ${notes}` : ''}`;
          break;
        
        case "delivered":
          // Only admin/photographer can deliver to client
          if (!["admin", "licensee", "photographer"].includes(userData?.role)) {
            return res.status(403).json({ message: "Insufficient permissions to deliver jobs" });
          }
          updateData.deliveredAt = now;
          updateData.status = "delivered"; // Auto-set to delivered
          activityDescription = "Job delivered to client";
          break;
        
        default:
          return res.status(400).json({ message: "Invalid action" });
      }

      // Add to history if field exists (will be available after database migration)
      try {
        if (jobCard.history !== undefined) {
          const historyEntry = {
            action,
            by: userId,
            at: now.toISOString(),
            notes
          };
          updateData.history = [...(jobCard.history || []), historyEntry];
        }
      } catch (error) {
        // Ignore history errors if column doesn't exist yet
        console.log("History tracking not available yet");
      }

      // Update job card using existing storage method - handle missing timestamp columns gracefully
      try {
        const updatedJobCard = await storage.updateJobCard(jobCardId, updateData, userId);
        res.json(updatedJobCard);
      } catch (error) {
        // If timestamp columns don't exist, fall back to legacy status update
        console.log("Timestamp columns not available, using legacy status update");
        let legacyStatus = jobCard.status;
        
        switch (action) {
          case "accept":
            legacyStatus = "in_progress";
            break;
          case "readyForQC":
            legacyStatus = "ready_for_qc";
            break;
          case "revision":
          case "delivered":
            return res.status(400).json({ message: "This action is handled within job cards" });
        }
        
        const updatedJobCard = await storage.updateJobCardStatus(jobCardId, legacyStatus, userId, notes);
        
        // Log activity
        await storage.logJobActivity(jobCardId, userId, `job_${action}`, activityDescription, { action, notes });
        
        res.json(updatedJobCard);
        return;
      }

      // Log activity
      await storage.logJobActivity(jobCardId, userId, `job_${action}`, activityDescription, { action, notes });
    } catch (error) {
      console.error("Error performing job action:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Enhanced Order Status API endpoints (Legacy support)
  app.put('/api/job-cards/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const jobCardId = parseInt(req.params.id);
      const { status, reason, changedBy } = req.body;
      
      const jobCard = await storage.updateJobCardStatus(jobCardId, status, changedBy || req.user.claims.sub, reason);
      res.json(jobCard);
    } catch (error) {
      console.error("Error updating job card status:", error);
      res.status(400).json({ message: "Failed to update job card status" });
    }
  });

  app.post('/api/job-cards/:id/send-delivery-email', isAuthenticated, async (req: any, res) => {
    try {
      const jobCardId = parseInt(req.params.id);
      
      // Get job card and client details
      const jobCard = await storage.getJobCardWithClient(jobCardId);
      if (!jobCard) {
        return res.status(404).json({ message: "Job card not found" });
      }

      const emailLog = await storage.sendDeliveryEmail(jobCardId, jobCard.client.email);
      res.json(emailLog);
    } catch (error) {
      console.error("Error sending delivery email:", error);
      res.status(500).json({ message: "Failed to send delivery email" });
    }
  });

  app.get('/api/job-cards/:id/audit-log', isAuthenticated, async (req: any, res) => {
    try {
      const jobCardId = parseInt(req.params.id);
      const auditLog = await storage.getOrderStatusAuditLog(jobCardId);
      res.json(auditLog);
    } catch (error) {
      console.error("Error fetching audit log:", error);
      res.status(500).json({ message: "Failed to fetch audit log" });
    }
  });

  // Production Files routes
  app.get('/api/job-cards/:id/files', isAuthenticated, async (req: any, res) => {
    try {
      const jobCardId = parseInt(req.params.id);
      const { mediaType, serviceCategory } = req.query;
      
      let files;
      if (mediaType) {
        files = await storage.getProductionFilesByType(
          jobCardId, 
          mediaType as string, 
          serviceCategory as string
        );
      } else {
        files = await storage.getProductionFiles(jobCardId);
      }
      
      // Add download URLs for S3 files
      if (s3Service) {
        const filesWithUrls = await Promise.all(
          files.map(async (file) => {
            if (file.s3Key) {
              try {
                const downloadUrl = await s3Service.withRetry(() => 
                  s3Service.generatePresignedDownloadUrl(file.s3Key)
                );
                return { ...file, downloadUrl };
              } catch (error) {
                console.error(`Failed to generate download URL for ${file.s3Key}:`, error);
                return file;
              }
            }
            return file;
          })
        );
        res.json(filesWithUrls);
      } else {
        res.json(files);
      }
    } catch (error) {
      console.error("Error fetching production files:", error);
      res.status(500).json({ message: "Failed to fetch production files" });
    }
  });

  // Server-side S3 upload proxy (fallback for CORS issues)
  app.post('/api/job-cards/:id/files/upload-proxy', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const jobCardId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const file = req.file;
      const { mediaType, serviceCategory, instructions, exportType, customDescription } = req.body;

      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      console.log(`Server-side upload proxy for job card ${jobCardId}:`, { 
        fileName: file.originalname, 
        contentType: file.mimetype, 
        size: file.size,
        mediaType 
      });

      // Check AWS environment variables
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION || !process.env.S3_BUCKET) {
        return res.status(500).json({ 
          message: "S3 service not configured - missing AWS credentials"
        });
      }

      if (!s3Service) {
        return res.status(503).json({ message: "S3 service not configured" });
      }

      // Check if Job ID has been assigned - REQUIRED for uploads
      const hasJobId = await storage.hasJobId(jobCardId);
      if (!hasJobId) {
        return res.status(400).json({ 
          message: "Job ID must be assigned before uploading files. Please assign a Job ID first." 
        });
      }

      // Validate file
      const validation = s3Service.validateFile({ size: file.size, type: file.mimetype });
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }

      const s3Key = s3Service.generateS3Key(jobCardId, file.originalname, mediaType || 'raw');
      
      // Determine tags based on media type
      const tags: Record<string, string> = {};
      if (mediaType === 'raw') {
        tags.type = 'raw';
      } else if (mediaType === 'final' || mediaType === 'finished') {
        tags.type = 'finished';
      }
      
      try {
        // Upload directly to S3 using server-side putObject
        console.log(`Uploading ${file.originalname} to S3 server-side with key: ${s3Key}`);
        await s3Service.uploadFileToS3(s3Key, file.buffer, file.mimetype, tags);
        
        // Save metadata to database
        const fileData = insertProductionFileSchema.parse({
          originalName: file.originalname,
          fileName: file.originalname,
          s3Key: s3Key,
          s3Bucket: process.env.S3_BUCKET,
          mediaType: mediaType || "raw",
          serviceCategory: serviceCategory || "photography",
          fileSize: file.size,
          mimeType: file.mimetype,
          jobCardId,
          uploadedBy: userId,
          instructions: instructions || "",
          exportType: exportType || "",
          customDescription: customDescription || "",
        });

        const savedFile = await storage.createProductionFile(fileData);
        console.log(`Successfully uploaded ${file.originalname} to S3 and saved metadata`);
        
        // Auto-create/update content items after upload
        if (mediaType === 'finished' || mediaType === 'final') {
          // Generate thumbnail for images
          let thumbnailKey = null;
          if (thumbnailService.isImageFile(file.mimetype)) {
            try {
              thumbnailKey = await thumbnailService.uploadThumbnail(
                jobCardId, 
                file.originalname, 
                file.buffer
              );
              console.log(`Thumbnail generated: ${thumbnailKey}`);
            } catch (error) {
              console.error('Failed to generate thumbnail:', error);
              // Continue without thumbnail - not a critical failure
            }
          }
          
          await createOrUpdateContentItem(jobCardId, serviceCategory || "photography", userId, thumbnailKey);
          
          // Auto-update job status to "Ready for QC" when editor uploads finished files
          await storage.updateJobCardStatus(jobCardId, "ready_for_qc", userId, "Finished files uploaded by editor");
        }
        
        res.status(201).json(savedFile);
      } catch (s3Error: any) {
        console.error("Server-side S3 upload error:", {
          message: s3Error.message,
          code: s3Error.code,
          name: s3Error.name,
          key: s3Key,
          fileName: file.originalname
        });
        res.status(500).json({ 
          message: "Failed to upload file to S3",
          details: s3Error.message
        });
      }
    } catch (error) {
      console.error("Server-side upload proxy error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // S3 presigned upload URL endpoint
  app.post('/api/job-cards/:id/files/upload-url', isAuthenticated, async (req: any, res) => {
    try {
      const jobCardId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { fileName, contentType, mediaType } = req.body;

      console.log(`Upload URL request for job card ${jobCardId}:`, { fileName, contentType, mediaType });

      // Check AWS environment variables
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION || !process.env.S3_BUCKET) {
        console.error("AWS environment variables missing:", {
          AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
          AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
          AWS_REGION: !!process.env.AWS_REGION,
          S3_BUCKET: !!process.env.S3_BUCKET
        });
        return res.status(500).json({ 
          message: "S3 service not configured - missing AWS credentials",
          details: "AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and S3_BUCKET must be set"
        });
      }

      if (!s3Service) {
        console.error("S3 service instance not available");
        return res.status(503).json({ message: "S3 service not configured" });
      }

      // Check if Job ID has been assigned - REQUIRED for uploads
      const hasJobId = await storage.hasJobId(jobCardId);
      if (!hasJobId) {
        console.log(`Job card ${jobCardId} does not have a Job ID assigned`);
        return res.status(400).json({ 
          message: "Job ID must be assigned before uploading files. Please assign a Job ID first." 
        });
      }

      // Validate file
      const validation = s3Service.validateFile({ size: req.body.fileSize || 0, type: contentType });
      if (!validation.valid) {
        console.log(`File validation failed for ${fileName}:`, validation.error);
        return res.status(400).json({ message: validation.error });
      }

      const s3Key = s3Service.generateS3Key(jobCardId, fileName, mediaType || 'raw');
      
      // Determine tags based on media type
      const tags: Record<string, string> = {};
      if (mediaType === 'raw') {
        tags.type = 'raw';
        console.log(`Generated S3 upload URL with tags for raw content: ${s3Key}`, tags);
      } else if (mediaType === 'final' || mediaType === 'finished') {
        tags.type = 'finished';
        console.log(`Generated S3 upload URL with tags for finished content: ${s3Key}`, tags);
      }
      
      try {
        const uploadUrl = await s3Service.withRetry(() => 
          s3Service.generatePresignedUploadUrl(s3Key, contentType, tags)
        );

        console.log(`Successfully generated presigned upload URL for ${s3Key}`);
        res.json({ uploadUrl, s3Key, tags });
      } catch (s3Error: any) {
        console.error("AWS S3 SDK Error:", {
          message: s3Error.message,
          code: s3Error.code,
          name: s3Error.name,
          requestId: s3Error.$metadata?.requestId,
          statusCode: s3Error.$metadata?.httpStatusCode,
          stack: s3Error.stack
        });
        
        // Provide specific error messages based on AWS error codes
        let errorMessage = "Failed to generate S3 upload URL";
        if (s3Error.code === 'AccessDenied') {
          errorMessage = "Access denied to S3 bucket. Check IAM permissions for s3:PutObject";
        } else if (s3Error.code === 'NoSuchBucket') {
          errorMessage = "S3 bucket does not exist";
        } else if (s3Error.code === 'InvalidBucketName') {
          errorMessage = "Invalid S3 bucket name";
        } else if (s3Error.code === 'CredentialsError') {
          errorMessage = "Invalid AWS credentials";
        }
        
        return res.status(500).json({ 
          message: errorMessage,
          details: s3Error.message,
          errorCode: s3Error.code
        });
      }
    } catch (error: any) {
      console.error("Error generating upload URL:", {
        message: error.message,
        stack: error.stack,
        jobCardId: req.params.id,
        fileName: req.body.fileName
      });
      res.status(500).json({ 
        message: "Failed to generate upload URL",
        details: error.message 
      });
    }
  });

  // Test S3 tagging endpoint
  app.get('/api/test-s3-tags', isAuthenticated, async (req: any, res) => {
    try {
      if (!s3Service) {
        return res.status(503).json({ message: "S3 service not configured" });
      }

      const testKey = 'test-files/test-upload.txt';
      const rawTags = { type: 'raw' };
      const finishedTags = { type: 'finished' };

      const rawUploadUrl = await s3Service.generatePresignedUploadUrl(testKey + '-raw', 'text/plain', rawTags);
      const finishedUploadUrl = await s3Service.generatePresignedUploadUrl(testKey + '-finished', 'text/plain', finishedTags);

      res.json({
        message: "S3 tagging test URLs generated successfully",
        rawUpload: {
          url: rawUploadUrl,
          key: testKey + '-raw',
          tags: rawTags
        },
        finishedUpload: {
          url: finishedUploadUrl,
          key: testKey + '-finished',
          tags: finishedTags
        }
      });
    } catch (error) {
      console.error("Error testing S3 tags:", error);
      res.status(500).json({ message: "Failed to test S3 tags", error: error.message });
    }
  });

  // S3 file metadata endpoint (after successful upload)
  app.post('/api/job-cards/:id/files/metadata', isAuthenticated, async (req: any, res) => {
    try {
      const jobCardId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { 
        fileName, 
        originalName, 
        s3Key, 
        fileSize, 
        mimeType, 
        mediaType, 
        serviceCategory, 
        instructions, 
        exportType, 
        customDescription 
      } = req.body;

      if (!s3Service) {
        return res.status(503).json({ message: "S3 service not configured" });
      }

      // Create database record
      const fileData = insertProductionFileSchema.parse({
        originalName: originalName || fileName,
        fileName: fileName,
        s3Key: s3Key,
        s3Bucket: process.env.S3_BUCKET,
        mediaType: mediaType || "raw",
        serviceCategory: serviceCategory || "general",
        fileSize: fileSize,
        mimeType: mimeType,
        jobCardId,
        uploadedBy: userId,
        instructions: instructions || "",
        exportType: exportType || "",
        customDescription: customDescription || "",
      });

      const savedFile = await storage.createProductionFile(fileData);
      res.status(201).json(savedFile);
    } catch (error) {
      console.error("Error saving file metadata:", error);
      res.status(400).json({ message: "Failed to save file metadata" });
    }
  });

  // Legacy file upload endpoint (with S3 integration and fallback)
  app.post('/api/job-cards/:id/files', isAuthenticated, upload.array('files', 10), async (req: any, res) => {
    try {
      const jobCardId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      // Check if Job ID has been assigned - REQUIRED for uploads
      const hasJobId = await storage.hasJobId(jobCardId);
      if (!hasJobId) {
        return res.status(400).json({ 
          message: "Job ID must be assigned before uploading files. Please assign a Job ID first." 
        });
      }

      const savedFiles = [];
      
      for (const file of files) {
        console.log('S3 upload attempt', file.originalname, 'Size:', file.size);
        
        let fileName: string;
        let s3Key: string | null = null;
        let s3Bucket: string | null = null;
        
        // Try S3 upload first, fallback to local storage
        if (s3Service) {
          try {
            // Validate file before upload
            const validation = s3Service.validateFile({ size: file.size, type: file.mimetype });
            if (!validation.valid) {
              console.error('File validation failed:', validation.error);
              return res.status(400).json({ message: `File ${file.originalname}: ${validation.error}` });
            }

            // Generate S3 key
            const mediaType = req.body.mediaType || "raw";
            s3Key = s3Service.generateS3Key(jobCardId, file.originalname, mediaType);
            s3Bucket = process.env.S3_BUCKET;
            
            // Determine tags based on media type
            const tags: Record<string, string> = {};
            if (mediaType === 'raw') {
              tags.type = 'raw';
            } else if (mediaType === 'final' || mediaType === 'finished') {
              tags.type = 'finished';
            }
            
            console.log('Uploading to S3 with tags:', s3Key, tags);
            
            // Upload to S3 with retry logic
            await s3Service.withRetry(async () => {
              const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
              const s3Client = new S3Client({
                region: process.env.AWS_REGION,
                credentials: {
                  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
                },
              });

              const command = new PutObjectCommand({
                Bucket: s3Bucket,
                Key: s3Key,
                Body: file.buffer,
                ContentType: file.mimetype,
                Tagging: tags.type ? `type=${encodeURIComponent(tags.type)}` : undefined,
              });

              await s3Client.send(command);
            });
            
            fileName = file.originalname; // Use original name for S3 uploads
            console.log('S3 upload successful:', s3Key);
            
          } catch (s3Error) {
            console.error('S3 upload failed, falling back to local storage:', s3Error);
            // Fallback to local storage
            s3Key = null;
            s3Bucket = null;
            fileName = await fileStorage.saveFile(file.buffer, file.originalname, jobCardId);
          }
        } else {
          // S3 not configured, use local storage
          console.log('S3 not configured, using local storage');
          fileName = await fileStorage.saveFile(file.buffer, file.originalname, jobCardId);
        }
        
        // Create database record
        const fileData = insertProductionFileSchema.parse({
          originalName: file.originalname,
          fileName: fileName,
          s3Key: s3Key,
          s3Bucket: s3Bucket,
          mediaType: req.body.mediaType || "raw",
          serviceCategory: req.body.serviceCategory || "photography",
          fileSize: file.size,
          mimeType: file.mimetype,
          jobCardId,
          uploadedBy: userId,
          instructions: req.body.instructions || "",
          exportType: req.body.exportType || "",
          customDescription: req.body.customDescription || "",
        });
        
        const savedFile = await storage.createProductionFile(fileData);
        savedFiles.push(savedFile);
      }
      
      res.status(201).json(savedFiles);
    } catch (error) {
      console.error("Error uploading files:", error);
      res.status(400).json({ message: "Failed to upload files", error: error.message });
    }
  });

  app.delete('/api/production-files/:id', isAuthenticated, async (req: any, res) => {
    try {
      const fileId = parseInt(req.params.id);
      await storage.deleteProductionFile(fileId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting production file:", error);
      res.status(500).json({ message: "Failed to delete production file" });
    }
  });

  // Notifications routes
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.put('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      await storage.markNotificationAsRead(notificationId);
      res.status(204).send();
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Editor workflow routes
  app.post('/api/job-cards/:id/download-raw-files', isAuthenticated, async (req: any, res) => {
    try {
      const jobCardId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      console.log('Download raw files request:', { jobCardId, userId });
      
      // Check if user is assigned to this job or is admin
      const user = await storage.getUser(userId);
      if (!user) {
        console.log('User not found:', userId);
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log('User found:', { id: user.id, role: user.role, licenseeId: user.licenseeId });
      
      // For admin users, get job card without licensee filter
      let jobCard;
      if (user.role === 'admin') {
        // Admin users can access any job card - use direct DB query without licensee filter
        console.log('Admin user accessing job card, querying database directly...');
        try {
          const result = await db.select().from(jobCards).where(eq(jobCards.id, jobCardId)).limit(1);
          if (result.length > 0) {
            // Get additional client info
            const clientResult = await db.select().from(clients).where(eq(clients.id, result[0].clientId)).limit(1);
            jobCard = {
              ...result[0],
              client: clientResult[0] || null,
              photographer: null,
              editor: null
            };
            console.log('Admin found job card:', { id: jobCard.id, licenseeId: jobCard.licenseeId });
          }
        } catch (error) {
          console.error('Error querying job card for admin:', error);
        }
      } else {
        // Regular users need licensee filter
        jobCard = await storage.getJobCard(jobCardId, user.licenseeId);
      }
      
      if (!jobCard) {
        console.log('Job card not found:', { jobCardId, licenseeId: user.licenseeId, isAdmin: user.role === 'admin' });
        return res.status(404).json({ message: "Job card not found" });
      }
      
      console.log('Job card found:', { id: jobCard.id, editorId: jobCard.editorId, status: jobCard.status });
      
      // Check permissions - must be assigned editor or admin
      if (jobCard.editorId !== userId && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get raw files for this job
      const rawFiles = await storage.getProductionFilesByType(jobCardId, 'raw');
      
      if (!rawFiles || rawFiles.length === 0) {
        return res.status(404).json({ message: "No raw files found" });
      }
      
      // If S3 is configured, generate download URLs
      if (s3Service) {
        // For single file, return direct download URL
        if (rawFiles.length === 1 && rawFiles[0].s3Key) {
          const downloadUrl = await s3Service.generatePresignedDownloadUrl(rawFiles[0].s3Key);
          
          // Log download activity
          await storage.createJobActivityLog({
            jobCardId,
            userId,
            action: 'raw_files_downloaded',
            description: `Editor downloaded raw files for editing (${rawFiles.length} file)`,
            metadata: {
              fileCount: rawFiles.length,
              downloadType: 'single',
              timestamp: new Date().toISOString()
            }
          });
          
          return res.json({ downloadUrl, fileCount: rawFiles.length });
        }
        
        // For multiple files, create a ZIP file
        if (rawFiles.length > 1) {
          console.log(`Creating ZIP archive for ${rawFiles.length} files`);
          
          try {
            // Set response headers for ZIP download
            const jobId = jobCard.jobId || `job_${jobCardId}`;
            const zipFileName = `${jobId}_raw_files.zip`;
            
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
            
            // Create ZIP archive with faster compression
            const archive = archiver('zip', {
              zlib: { level: 1 } // Fastest compression (was 9 - maximum)
            });
            
            // Handle archive errors
            archive.on('error', (err) => {
              console.error('Archive error:', err);
              if (!res.headersSent) {
                res.status(500).json({ message: "Error creating ZIP file" });
              }
            });
            
            // Handle archive completion
            archive.on('end', () => {
              console.log(`ZIP archive completed: ${zipFileName}`);
            });
            
            // Progress tracking
            let filesProcessed = 0;
            archive.on('progress', (progress) => {
              if (progress.entries && progress.entries.processed !== filesProcessed) {
                filesProcessed = progress.entries.processed;
                console.log(`ZIP Progress: ${filesProcessed}/${rawFiles.length} files processed`);
              }
            });
            
            // Pipe archive to response
            archive.pipe(res);
            
            // Process files sequentially to avoid overwhelming S3 and archiver
            let processedFiles = 0;
            const startTime = Date.now();
            
            for (const file of rawFiles) {
              if (file.s3Key) {
                try {
                  const fileStartTime = Date.now();
                  console.log(`[${processedFiles + 1}/${rawFiles.length}] Adding file to ZIP: ${file.fileName}`);
                  
                  // Get file stream from S3 with retry logic
                  const fileStream = await s3Service.withRetry(
                    () => s3Service.getFileStream(file.s3Key),
                    3, // Max retries
                    100 // Base delay ms
                  );
                  
                  // Add file to archive with original filename
                  archive.append(fileStream, { name: file.fileName });
                  
                  processedFiles++;
                  const fileTime = Date.now() - fileStartTime;
                  console.log(`✓ File ${file.fileName} added to ZIP in ${fileTime}ms`);
                } catch (error) {
                  console.error(`✗ Error adding file ${file.fileName} to ZIP:`, error);
                  // Continue with other files
                }
              }
            }
            
            const totalTime = Date.now() - startTime;
            console.log(`ZIP Processing Complete: ${processedFiles}/${rawFiles.length} files processed in ${totalTime}ms`);
            console.log(`Average time per file: ${Math.round(totalTime / processedFiles)}ms`);
            
            // Finalize archive
            await archive.finalize();
            
            // Log download activity asynchronously to avoid blocking response
            setTimeout(async () => {
              try {
                await storage.createJobActivityLog({
                  jobCardId,
                  userId,
                  action: 'raw_files_downloaded',
                  description: `Editor downloaded raw files for editing (${rawFiles.length} files as ZIP)`,
                  metadata: {
                    fileCount: rawFiles.length,
                    downloadType: 'zip',
                    zipFileName,
                    timestamp: new Date().toISOString()
                  }
                });
              } catch (logError) {
                console.error('Error logging download activity:', logError);
              }
            }, 100);
            
            return; // Response handled by stream
          } catch (zipError) {
            console.error('Error creating ZIP file:', zipError);
            if (!res.headersSent) {
              res.status(500).json({ message: "Failed to create ZIP file" });
            }
            return;
          }
        }
      }
      
      // Fallback to local storage
      if (rawFiles[0].fileName) {
        const fileBuffer = await fileStorage.getFile(rawFiles[0].fileName);
        
        // Log download activity
        await storage.createJobActivityLog({
          jobCardId,
          userId,
          action: 'raw_files_downloaded',
          description: `Editor downloaded raw files for editing (${rawFiles.length} files)`,
          metadata: {
            fileCount: rawFiles.length,
            downloadType: 'local',
            timestamp: new Date().toISOString()
          }
        });
        
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${rawFiles[0].originalName}"`);
        res.send(fileBuffer);
      } else {
        return res.status(404).json({ message: "File not accessible" });
      }
    } catch (error) {
      console.error("Error downloading raw files:", error);
      res.status(500).json({ message: "Failed to download raw files" });
    }
  });

  app.post('/api/job-cards/:id/revision-reply', isAuthenticated, async (req: any, res) => {
    try {
      const jobCardId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { reply, status } = req.body;
      
      // Check if user is assigned to this job
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // For admin users, get job card without licensee filter
      let jobCard;
      if (user.role === 'admin') {
        jobCard = await storage.getJobCards().then(cards => cards.find(card => card.id === jobCardId));
      } else {
        jobCard = await storage.getJobCard(jobCardId, user.licenseeId);
      }
      
      if (!jobCard) {
        return res.status(404).json({ message: "Job card not found" });
      }
      
      if (jobCard.editorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Update job status - use appropriate licenseeId for admin users
      const licenseeIdForUpdate = user.role === 'admin' ? (jobCard.licenseeId || user.licenseeId) : user.licenseeId;
      await storage.updateJobCard(jobCardId, { 
        status: status || 'editing',
        revisionNotes: reply 
      }, licenseeIdForUpdate);
      
      // Log revision response activity
      await storage.createJobActivityLog({
        jobCardId,
        userId,
        action: 'revision_response',
        description: `Editor responded to revision request`,
        metadata: {
          reply,
          timestamp: new Date().toISOString()
        }
      });
      
      res.json({ success: true, message: "Revision response submitted" });
    } catch (error) {
      console.error("Error submitting revision response:", error);
      res.status(500).json({ message: "Failed to submit revision response" });
    }
  });

  app.post('/api/job-cards/:id/activity', isAuthenticated, async (req: any, res) => {
    try {
      const jobCardId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { action, description } = req.body;
      
      console.log('Activity log request:', { jobCardId, userId, action, description });
      
      // Get user info first
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log('User found:', { id: user.id, role: user.role, licenseeId: user.licenseeId });
      
      // Check if user has access to this job - handle admin users differently
      let jobCard;
      if (user.role === 'admin') {
        // Admin users can access any job card - use direct DB query without licensee filter
        console.log('Admin user accessing job card for activity logging...');
        try {
          const result = await db.select().from(jobCards).where(eq(jobCards.id, jobCardId)).limit(1);
          if (result.length > 0) {
            jobCard = result[0];
            console.log('Admin found job card for activity:', { id: jobCard.id, licenseeId: jobCard.licenseeId });
          }
        } catch (error) {
          console.error('Error querying job card for admin activity:', error);
        }
      } else {
        // Regular users need licensee filter
        jobCard = await storage.getJobCard(jobCardId, user.licenseeId);
      }
      
      if (!jobCard) {
        console.log('Job card not found for activity:', { jobCardId, licenseeId: user.licenseeId, isAdmin: user.role === 'admin' });
        return res.status(404).json({ message: "Job card not found" });
      }
      
      // Check permissions
      if (jobCard.editorId !== userId && user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Create activity log entry
      const activityLog = await storage.createJobActivityLog({
        jobCardId,
        userId,
        action,
        description,
        metadata: {
          timestamp: new Date().toISOString()
        }
      });
      
      res.status(201).json(activityLog);
    } catch (error) {
      console.error("Error creating activity log:", error);
      res.status(500).json({ message: "Failed to create activity log" });
    }
  });

  // File serving routes
  app.get('/api/files/:fileName', isAuthenticated, async (req: any, res) => {
    try {
      const fileName = req.params.fileName;
      const fileBuffer = await fileStorage.getFile(fileName);
      
      // Set appropriate headers
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(fileBuffer);
    } catch (error) {
      console.error("Error serving file:", error);
      res.status(404).json({ message: "File not found" });
    }
  });

  // Calendar routes
  app.get('/api/calendar/events', isAuthenticated, async (req: any, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      const { photographerId } = req.query;
      
      const events = await storage.getCalendarEvents(licenseeId, photographerId as string);
      res.json(events);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({ message: "Failed to fetch calendar events" });
    }
  });

  app.post('/api/calendar/events', isAuthenticated, async (req: any, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      const userId = req.user.claims.sub;
      
      const eventData = insertCalendarEventSchema.parse({
        ...req.body,
        licenseeId,
        createdBy: userId,
      });
      
      const event = await storage.createCalendarEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating calendar event:", error);
      res.status(400).json({ message: "Failed to create calendar event" });
    }
  });

  app.put('/api/calendar/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const updateData = req.body;
      
      const event = await storage.updateCalendarEvent(eventId, updateData);
      res.json(event);
    } catch (error) {
      console.error("Error updating calendar event:", error);
      res.status(400).json({ message: "Failed to update calendar event" });
    }
  });

  app.delete('/api/calendar/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      await storage.deleteCalendarEvent(eventId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      res.status(500).json({ message: "Failed to delete calendar event" });
    }
  });

  // Business settings routes
  app.get('/api/business-settings', isAuthenticated, async (req: any, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      const settings = await storage.getBusinessSettings(licenseeId);
      
      if (!settings) {
        // Return default settings
        const defaultSettings = {
          businessHours: {
            mon: { start: "08:00", end: "18:00" },
            tue: { start: "08:00", end: "18:00" },
            wed: { start: "08:00", end: "18:00" },
            thu: { start: "08:00", end: "18:00" },
            fri: { start: "08:00", end: "18:00" },
            sat: { start: "09:00", end: "17:00" },
            sun: { start: "09:00", end: "17:00" },
          },
          minimumNoticeHours: 24,
          bufferTimeBetweenJobs: 30,
          defaultJobDuration: 120,
          timezone: "America/New_York",
        };
        return res.json(defaultSettings);
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Error fetching business settings:", error);
      res.status(500).json({ message: "Failed to fetch business settings" });
    }
  });

  app.put('/api/business-settings', isAuthenticated, async (req: any, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      
      const settingsData = insertBusinessSettingsSchema.parse({
        ...req.body,
        licenseeId,
      });
      
      const settings = await storage.upsertBusinessSettings(settingsData);
      res.json(settings);
    } catch (error) {
      console.error("Error updating business settings:", error);
      res.status(400).json({ message: "Failed to update business settings" });
    }
  });

  // Google Calendar OAuth routes
  app.get('/api/auth/google', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const authUrl = googleCalendarService.generateAuthUrl(userId);
      res.redirect(authUrl);
    } catch (error) {
      console.error("Error generating Google auth URL:", error);
      res.status(500).json({ message: "Failed to initiate Google Calendar authorization" });
    }
  });

  app.get('/api/auth/google/callback', async (req: any, res) => {
    try {
      const { code, state } = req.query;
      const userId = state; // userId was passed as state parameter

      if (!code || !userId) {
        return res.status(400).json({ message: "Missing authorization code or user ID" });
      }

      // Exchange code for tokens
      const tokens = await googleCalendarService.exchangeCodeForTokens(code);

      // Store integration
      const integrationData = insertGoogleCalendarIntegrationSchema.parse({
        userId,
        googleCalendarId: 'primary', // Default to primary calendar
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiry: tokens.expiry,
        isActive: true,
        syncDirection: 'both'
      });

      await storage.createGoogleCalendarIntegration(integrationData);

      // Redirect back to calendar page with success
      res.redirect('/calendar?google_connected=true');
    } catch (error) {
      console.error("Error handling Google auth callback:", error);
      res.redirect('/calendar?google_error=true');
    }
  });

  // Google Calendar integration management
  app.get('/api/google-calendar/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const integration = await storage.getGoogleCalendarIntegration(userId);
      
      res.json({
        connected: !!integration,
        lastSync: integration?.lastSyncAt,
        syncDirection: integration?.syncDirection
      });
    } catch (error) {
      console.error("Error getting Google Calendar status:", error);
      res.status(500).json({ message: "Failed to get Google Calendar status" });
    }
  });

  app.delete('/api/google-calendar/disconnect', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteGoogleCalendarIntegration(userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error disconnecting Google Calendar:", error);
      res.status(500).json({ message: "Failed to disconnect Google Calendar" });
    }
  });

  app.post('/api/google-calendar/sync', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const integration = await storage.getGoogleCalendarIntegration(userId);
      
      if (!integration) {
        return res.status(404).json({ message: "Google Calendar not connected" });
      }

      // Trigger inbound sync
      await googleCalendarService.syncInboundEvents(integration);
      
      res.json({ message: "Sync completed successfully" });
    } catch (error) {
      console.error("Error syncing Google Calendar:", error);
      res.status(500).json({ message: "Failed to sync Google Calendar" });
    }
  });

  // Delivery routes (public - no authentication required)
  app.get("/api/delivery/:jobCardId", async (req, res) => {
    try {
      const jobCardId = parseInt(req.params.jobCardId);
      
      if (isNaN(jobCardId)) {
        return res.status(400).json({ message: "Invalid job card ID" });
      }

      const jobCard = await storage.getJobCardForDelivery(jobCardId);
      if (!jobCard) {
        return res.status(404).json({ message: "Job card not found" });
      }

      // Get production files for this job
      const files = await storage.getProductionFiles(jobCardId);
      
      // Track page view
      await storage.createDeliveryTracking({
        jobCardId,
        actionType: "page_view",
        clientInfo: {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString(),
        },
      });

      res.json({
        jobCard,
        files,
      });
    } catch (error) {
      console.error("Get delivery page error:", error);
      res.status(500).json({ message: "Failed to get delivery page" });
    }
  });

  app.post("/api/delivery/:jobCardId/comment", async (req, res) => {
    try {
      const jobCardId = parseInt(req.params.jobCardId);
      const { clientName, clientEmail, comment, requestRevision } = req.body;

      if (isNaN(jobCardId)) {
        return res.status(400).json({ message: "Invalid job card ID" });
      }

      if (!clientName || !clientEmail || !comment) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const newComment = await storage.createDeliveryComment({
        jobCardId,
        clientName,
        clientEmail,
        comment,
        requestRevision: requestRevision || false,
      });

      res.json(newComment);
    } catch (error) {
      console.error("Create delivery comment error:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.post("/api/delivery/:jobCardId/download", async (req, res) => {
    try {
      const jobCardId = parseInt(req.params.jobCardId);
      const { fileName, fileType } = req.body;

      if (isNaN(jobCardId)) {
        return res.status(400).json({ message: "Invalid job card ID" });
      }

      // Track download
      await storage.createDeliveryTracking({
        jobCardId,
        actionType: fileName ? "file_download" : "bulk_download",
        fileName: fileName || null,
        clientInfo: {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          fileType: fileType || "unknown",
          timestamp: new Date().toISOString(),
        },
      });

      res.json({ message: "Download tracked successfully" });
    } catch (error) {
      console.error("Track download error:", error);
      res.status(500).json({ message: "Failed to track download" });
    }
  });

  // Delivery settings routes (authenticated)
  app.get("/api/jobs/:id/delivery-settings", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const jobCardId = parseInt(req.params.id);
      
      if (isNaN(jobCardId)) {
        return res.status(400).json({ message: "Invalid job card ID" });
      }

      const settings = await storage.getJobCardDeliverySettings(jobCardId);
      res.json(settings);
    } catch (error) {
      console.error("Get delivery settings error:", error);
      res.status(500).json({ message: "Failed to get delivery settings" });
    }
  });

  app.post("/api/jobs/:id/delivery-settings", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const jobCardId = parseInt(req.params.id);
      const settings = req.body;

      if (isNaN(jobCardId)) {
        return res.status(400).json({ message: "Invalid job card ID" });
      }

      // Generate delivery URL if not provided
      if (!settings.deliveryUrl) {
        settings.deliveryUrl = `job-${jobCardId}-${Date.now()}`;
      }

      settings.jobCardId = jobCardId;

      const newSettings = await storage.createJobCardDeliverySettings(settings);
      res.json(newSettings);
    } catch (error) {
      console.error("Create delivery settings error:", error);
      res.status(500).json({ message: "Failed to create delivery settings" });
    }
  });

  app.put("/api/jobs/:id/delivery-settings", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const jobCardId = parseInt(req.params.id);
      const settings = req.body;

      if (isNaN(jobCardId)) {
        return res.status(400).json({ message: "Invalid job card ID" });
      }

      const updatedSettings = await storage.updateJobCardDeliverySettings(jobCardId, settings);
      res.json(updatedSettings);
    } catch (error) {
      console.error("Update delivery settings error:", error);
      res.status(500).json({ message: "Failed to update delivery settings" });
    }
  });

  // Quick job status update endpoint for the status panel
  app.patch("/api/jobs/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      const jobCardId = parseInt(req.params.id);
      const { status, notes } = req.body;

      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      // Get current job card to check permissions and log changes
      const currentJob = await storage.getJobCard(jobCardId, licenseeId);
      if (!currentJob) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Update job status
      const updateData: any = { status };
      
      // Set automatic timestamps based on status
      if (status === 'in_progress' && !currentJob.assignedAt) {
        updateData.assignedAt = new Date();
      }
      if (status === 'delivered' && !currentJob.deliveredAt) {
        updateData.deliveredAt = new Date();
      }
      if (['ready_for_qa', 'editing'].includes(status) && !currentJob.completedAt) {
        updateData.completedAt = new Date();
      }

      const updatedJob = await storage.updateJobCard(jobCardId, updateData, licenseeId);

      // Log activity for status change
      try {
        await storage.createJobActivityLog({
          jobCardId: jobCardId,
          action: "status_updated",
          description: `Job status changed from ${currentJob.status} to ${status}${notes ? ` - ${notes}` : ''}`,
          createdAt: new Date(),
          metadata: {
            previousStatus: currentJob.status,
            newStatus: status,
            notes: notes,
            updatedBy: licenseeId
          }
        });
      } catch (logError) {
        console.error("Failed to log status change activity:", logError);
        // Don't fail the request if logging fails
      }

      res.json(updatedJob);
    } catch (error) {
      console.error("Error updating job status:", error);
      res.status(500).json({ message: "Failed to update job status" });
    }
  });

  // Product Management Routes
  app.get("/api/products", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      const products = await storage.getProducts(licenseeId);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      const product = await storage.getProduct(req.params.id, licenseeId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post("/api/products", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      const productData = insertProductSchema.parse({ ...req.body, licenseeId });
      const product = await storage.createProduct(productData);
      res.json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put("/api/products/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      const productData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(req.params.id, productData, licenseeId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      await storage.deleteProduct(req.params.id, licenseeId);
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Editor Service Pricing Routes
  app.get("/api/editor-services/:editorId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const editorId = req.params.editorId;
      const { editorServiceService } = await import("./services/editorServiceService");
      const serviceStructure = await editorServiceService.getEditorServiceStructure(editorId);
      res.json(serviceStructure);
    } catch (error) {
      console.error("Error fetching editor services:", error);
      res.status(500).json({ message: "Failed to fetch editor services" });
    }
  });

  app.post("/api/editor-services/:editorId/categories", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const editorId = req.params.editorId;
      const { editorServiceService } = await import("./services/editorServiceService");
      const category = await editorServiceService.createCategory({
        editorId,
        ...req.body
      });
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.put("/api/editor-services/categories/:categoryId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const { editorServiceService } = await import("./services/editorServiceService");
      const category = await editorServiceService.updateCategory(categoryId, req.body);
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/editor-services/categories/:categoryId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const { editorServiceService } = await import("./services/editorServiceService");
      await editorServiceService.deleteCategory(categoryId);
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  app.post("/api/editor-services/categories/:categoryId/options", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const { editorServiceService } = await import("./services/editorServiceService");
      const option = await editorServiceService.createOption({
        categoryId,
        ...req.body
      });
      res.json(option);
    } catch (error) {
      console.error("Error creating option:", error);
      res.status(500).json({ message: "Failed to create option" });
    }
  });

  app.put("/api/editor-services/options/:optionId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const optionId = parseInt(req.params.optionId);
      const { editorServiceService } = await import("./services/editorServiceService");
      const option = await editorServiceService.updateOption(optionId, req.body);
      res.json(option);
    } catch (error) {
      console.error("Error updating option:", error);
      res.status(500).json({ message: "Failed to update option" });
    }
  });

  app.delete("/api/editor-services/options/:optionId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const optionId = parseInt(req.params.optionId);
      const { editorServiceService } = await import("./services/editorServiceService");
      await editorServiceService.deleteOption(optionId);
      res.json({ message: "Option deleted successfully" });
    } catch (error) {
      console.error("Error deleting option:", error);
      res.status(500).json({ message: "Failed to delete option" });
    }
  });

  // Service Templates Routes
  app.get("/api/service-templates", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      const { editorServiceService } = await import("./services/editorServiceService");
      const templates = await editorServiceService.getServiceTemplates(licenseeId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching service templates:", error);
      res.status(500).json({ message: "Failed to fetch service templates" });
    }
  });

  app.post("/api/service-templates", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const licenseeId = req.user.claims.sub;
      const { editorServiceService } = await import("./services/editorServiceService");
      const template = await editorServiceService.createServiceTemplate({
        licenseeId,
        createdBy: licenseeId,
        ...req.body
      });
      res.json(template);
    } catch (error) {
      console.error("Error creating service template:", error);
      res.status(500).json({ message: "Failed to create service template" });
    }
  });

  app.post("/api/service-templates/:templateId/apply/:editorId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const templateId = parseInt(req.params.templateId);
      const editorId = req.params.editorId;
      const { editorServiceService } = await import("./services/editorServiceService");
      await editorServiceService.applyTemplateToEditor(templateId, editorId);
      res.json({ message: "Template applied successfully" });
    } catch (error) {
      console.error("Error applying template:", error);
      res.status(500).json({ message: "Failed to apply template" });
    }
  });

  app.get("/api/editor-services/:editorId/change-history", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const editorId = req.params.editorId;
      const { editorServiceService } = await import("./services/editorServiceService");
      const history = await editorServiceService.getChangeHistory(editorId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching change history:", error);
      res.status(500).json({ message: "Failed to fetch change history" });
    }
  });

  // Bulk ordering routes
  app.put("/api/editor-services/categories/order", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { categoryIds } = req.body;
      const { editorServiceService } = await import("./services/editorServiceService");
      await editorServiceService.updateCategoryOrder(categoryIds);
      res.json({ message: "Category order updated successfully" });
    } catch (error) {
      console.error("Error updating category order:", error);
      res.status(500).json({ message: "Failed to update category order" });
    }
  });

  app.put("/api/editor-services/options/order", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { optionIds } = req.body;
      const { editorServiceService } = await import("./services/editorServiceService");
      await editorServiceService.updateOptionOrder(optionIds);
      res.json({ message: "Option order updated successfully" });
    } catch (error) {
      console.error("Error updating option order:", error);
      res.status(500).json({ message: "Failed to update option order" });
    }
  });

  // Content Items API endpoints
  app.get('/api/job-cards/:id/content-items', isAuthenticated, async (req: any, res) => {
    try {
      const jobCardId = parseInt(req.params.id);
      const serviceCategory = req.query.category as string;
      
      const contentItems = await storage.getContentItems(jobCardId, serviceCategory);
      res.json(contentItems);
    } catch (error) {
      console.error('Error fetching content items:', error);
      res.status(500).json({ message: 'Failed to fetch content items' });
    }
  });

  app.post('/api/job-cards/:id/content-items', isAuthenticated, async (req: any, res) => {
    try {
      const jobCardId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { category, name, description } = req.body;
      
      const contentItem = {
        jobCardId,
        category,
        name,
        description,
        createdBy: userId,
        updatedBy: userId,
      };
      
      const savedItem = await storage.createContentItem(contentItem);
      res.status(201).json(savedItem);
    } catch (error) {
      console.error('Error creating content item:', error);
      res.status(500).json({ message: 'Failed to create content item' });
    }
  });

  app.put('/api/content-items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const updates = { ...req.body, updatedBy: userId };
      
      const updatedItem = await storage.updateContentItem(itemId, updates);
      res.json(updatedItem);
    } catch (error) {
      console.error('Error updating content item:', error);
      res.status(500).json({ message: 'Failed to update content item' });
    }
  });

  app.delete('/api/content-items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const itemId = parseInt(req.params.id);
      
      const success = await storage.deleteContentItem(itemId);
      if (success) {
        res.json({ message: 'Content item deleted successfully' });
      } else {
        res.status(404).json({ message: 'Content item not found' });
      }
    } catch (error) {
      console.error('Error deleting content item:', error);
      res.status(500).json({ message: 'Failed to delete content item' });
    }
  });

  // Test endpoint for content items (can be removed after testing)
  app.post('/api/test-content-items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log('Testing content items system...');
      
      // Create test content item
      const testItem = {
        jobCardId: 1, // Use existing job card
        category: 'photography',
        name: '#00001 Test Images ON',
        description: 'Test photography content item from API',
        status: 'draft',
        fileCount: 3,
        s3Urls: ['test-url-1.jpg', 'test-url-2.jpg', 'test-url-3.jpg'],
        createdBy: userId,
        updatedBy: userId
      };

      const createdItem = await storage.createContentItem(testItem);
      console.log('✓ Created test content item:', createdItem);

      // Update the item
      const updatedItem = await storage.updateContentItem(createdItem.id, {
        status: 'ready_for_qc',
        fileCount: 5,
        s3Urls: ['test-url-1.jpg', 'test-url-2.jpg', 'test-url-3.jpg', 'test-url-4.jpg', 'test-url-5.jpg']
      });
      console.log('✓ Updated test content item:', updatedItem);

      // Get all content items for the job
      const allItems = await storage.getContentItems(1);
      console.log('✓ All content items for job 1:', allItems);

      res.json({
        success: true,
        message: 'Content items test completed successfully',
        data: {
          created: createdItem,
          updated: updatedItem,
          all: allItems
        }
      });
    } catch (error) {
      console.error('❌ Error testing content items:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Content items test failed',
        error: error.message
      });
    }
  });

  // Content Items API endpoints - Filter to show only editor-uploaded finished content
  app.get('/api/job-cards/:id/content-items', isAuthenticated, async (req: any, res) => {
    try {
      const jobCardId = parseInt(req.params.id);
      const category = req.query.category as string;
      
      console.log(`Fetching content items for job card ${jobCardId}, category: ${category}`);
      
      // Get all content items for the job card first
      const allItems = await storage.getContentItems(jobCardId);
      console.log(`Found ${allItems.length} total content items for job card ${jobCardId}`);
      
      // Filter for only editor-uploaded finished content
      const filteredItems = allItems.filter(item => 
        item.uploaderRole === 'editor' && 
        item.type === 'finished' &&
        (!category || item.category === category)
      );
      
      console.log(`After filtering for editor/finished: ${filteredItems.length} items`);
      
      // Generate presigned URLs for thumbnails if they exist
      const contentItemsWithThumbs = await Promise.all(
        filteredItems.map(async (item) => {
          if (item.thumbUrl && s3Service) {
            try {
              const thumbnailUrl = await s3Service.getPresignedUrl(item.thumbUrl);
              return { ...item, thumbnailUrl };
            } catch (error) {
              console.warn(`Failed to generate thumbnail URL for ${item.thumbUrl}:`, error);
              return item;
            }
          }
          return item;
        })
      );
      
      console.log(`Returning ${contentItemsWithThumbs.length} content items with thumbnails`);
      res.json(contentItemsWithThumbs);
    } catch (error) {
      console.error('Error fetching content items:', error);
      res.status(500).json({ message: 'Failed to fetch content items' });
    }
  });

  app.post('/api/job-cards/:id/content-items', isAuthenticated, async (req: any, res) => {
    try {
      const jobCardId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Generate content ID
      const contentId = await storage.generateContentId();
      
      const contentItem = {
        ...req.body,
        jobCardId,
        contentId,
        uploaderRole: 'editor', // Flag editor uploads
        type: 'finished', // Flag as finished content
        createdBy: userId,
        updatedBy: userId
      };
      
      const createdItem = await storage.createContentItem(contentItem);
      res.status(201).json(createdItem);
    } catch (error) {
      console.error('Error creating content item:', error);
      res.status(500).json({ message: 'Failed to create content item' });
    }
  });

  app.put('/api/content-items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const updates = {
        ...req.body,
        updatedBy: userId
      };
      
      const updatedItem = await storage.updateContentItem(id, updates);
      res.json(updatedItem);
    } catch (error) {
      console.error('Error updating content item:', error);
      res.status(500).json({ message: 'Failed to update content item' });
    }
  });

  app.delete('/api/content-items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      await storage.deleteContentItem(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting content item:', error);
      res.status(500).json({ message: 'Failed to delete content item' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
