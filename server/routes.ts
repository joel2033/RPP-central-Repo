import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertClientSchema, 
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
  insertEmailDeliveryLogSchema
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import { fileStorage } from "./fileStorage";
import { requireEditor, requireAdmin, requireVA, requireAdminOrVA, requireProductionStaff } from "./middleware/roleAuth";
import { googleCalendarService } from "./googleCalendar";

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

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
  app.get('/api/editor/job-cards', isAuthenticated, requireEditor, async (req: any, res) => {
    try {
      const editorId = req.user.claims.sub;
      const userData = (req as any).userData;
      const licenseeId = userData.licenseeId;
      
      const jobCards = await storage.getJobCardsByEditor(editorId, licenseeId);
      res.json(jobCards);
    } catch (error) {
      console.error("Error fetching editor job cards:", error);
      res.status(500).json({ message: "Failed to fetch job cards" });
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
        const allowedStatuses = ['editing', 'ready_for_qa'];
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
        if (['ready_for_qa', 'editing'].includes(updateData.status) && !updateData.completedAt) {
          updateData.completedAt = new Date();
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

  // Enhanced Order Status API endpoints
  app.put('/api/job-cards/:id/status', isAuthenticated, requireAdminOrVA, async (req: any, res) => {
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

  app.post('/api/job-cards/:id/send-delivery-email', isAuthenticated, requireAdminOrVA, async (req: any, res) => {
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

  app.get('/api/job-cards/:id/audit-log', isAuthenticated, requireAdminOrVA, async (req: any, res) => {
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
      
      res.json(files);
    } catch (error) {
      console.error("Error fetching production files:", error);
      res.status(500).json({ message: "Failed to fetch production files" });
    }
  });

  app.post('/api/job-cards/:id/files', isAuthenticated, upload.array('files', 10), async (req: any, res) => {
    try {
      const jobCardId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const savedFiles = [];
      
      for (const file of files) {
        // Save file to storage
        const fileName = await fileStorage.saveFile(file.buffer, file.originalname, jobCardId);
        
        // Create database record
        const fileData = insertProductionFileSchema.parse({
          originalName: req.body.fileName || file.originalname,
          fileName: fileName,
          mediaType: req.body.mediaType || "raw",
          serviceCategory: req.body.serviceCategory || "general",
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
      res.status(400).json({ message: "Failed to upload files" });
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

  const httpServer = createServer(app);
  return httpServer;
}
