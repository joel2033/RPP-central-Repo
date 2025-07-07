import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertClientSchema, insertBookingSchema, insertCommunicationSchema } from "@shared/schema";
import { z } from "zod";

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
      const bookingData = insertBookingSchema.parse({
        ...req.body,
        licenseeId,
      });
      const booking = await storage.createBooking(bookingData);
      res.status(201).json(booking);
    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(400).json({ message: "Failed to create booking" });
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

  const httpServer = createServer(app);
  return httpServer;
}
