import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
  date,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum
export const userRoleEnum = pgEnum("user_role", ["admin", "photographer", "va", "licensee", "editor"]);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").default("licensee"),
  licenseeId: varchar("licensee_id"), // For data isolation
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Clients table
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  contactName: varchar("contact_name", { length: 255 }),
  editingPreferences: jsonb("editing_preferences"), // Client preset preferences for auto-fill
  licenseeId: varchar("licensee_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Service types enum
export const serviceTypeEnum = pgEnum("service_type", ["photography", "drone", "floor_plans", "video"]);

// Job status enum
export const jobStatusEnum = pgEnum("job_status", ["pending", "confirmed", "in_progress", "completed", "cancelled"]);

// Production workflow enums
export const jobCardStatusEnum = pgEnum("job_card_status", ["unassigned", "in_progress", "editing", "ready_for_qa", "in_revision", "delivered"]);
export const mediaTypeEnum = pgEnum("media_type", ["raw", "edited", "final"]);
export const serviceCategoryEnum = pgEnum("service_category", ["photography", "floor_plan", "drone", "video"]);

// Bookings table
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  propertyAddress: text("property_address").notNull(),
  scheduledDate: date("scheduled_date").notNull(),
  scheduledTime: varchar("scheduled_time", { length: 10 }),
  services: serviceTypeEnum("services").array().notNull(),
  status: jobStatusEnum("status").default("pending"),
  photographerId: varchar("photographer_id"),
  notes: text("notes"),
  price: decimal("price", { precision: 10, scale: 2 }),
  licenseeId: varchar("licensee_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Media files table
export const mediaFiles = pgTable("media_files", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  serviceType: serviceTypeEnum("service_type").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// QA checklist table
export const qaChecklists = pgTable("qa_checklists", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull(),
  photographyComplete: boolean("photography_complete").default(false),
  droneComplete: boolean("drone_complete").default(false),
  floorPlansComplete: boolean("floor_plans_complete").default(false),
  videoComplete: boolean("video_complete").default(false),
  qualityApproved: boolean("quality_approved").default(false),
  clientNotified: boolean("client_notified").default(false),
  deliveryReady: boolean("delivery_ready").default(false),
  completedAt: timestamp("completed_at"),
  completedBy: varchar("completed_by"),
});

// Communication history table
export const communications = pgTable("communications", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  bookingId: integer("booking_id"),
  type: varchar("type", { length: 50 }).notNull(), // email, phone, meeting
  subject: varchar("subject", { length: 255 }),
  message: text("message"),
  timestamp: timestamp("timestamp").defaultNow(),
  userId: varchar("user_id").notNull(),
});

// Job Cards table (Production workflow)
export const jobCards = pgTable("job_cards", {
  id: serial("id").primaryKey(),
  jobId: varchar("job_id", { length: 50 }).notNull().unique(), // Generated job ID
  bookingId: integer("booking_id").notNull(),
  clientId: integer("client_id").notNull(),
  photographerId: varchar("photographer_id"),
  editorId: varchar("editor_id"),
  status: jobCardStatusEnum("status").default("unassigned"),
  requestedServices: jsonb("requested_services").notNull(), // Array of services
  editingNotes: text("editing_notes"), // Auto-filled from client preferences
  revisionNotes: text("revision_notes"), // QA revision notes
  assignedAt: timestamp("assigned_at"),
  completedAt: timestamp("completed_at"),
  deliveredAt: timestamp("delivered_at"),
  licenseeId: varchar("licensee_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Production Files table (Raw and final files)
export const productionFiles = pgTable("production_files", {
  id: serial("id").primaryKey(),
  jobCardId: integer("job_card_id").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  mediaType: mediaTypeEnum("media_type").notNull(), // raw, edited, final
  serviceCategory: serviceCategoryEnum("service_category").notNull(),
  uploadedBy: varchar("uploaded_by").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});

// Production workflow notifications/alerts
export const productionNotifications = pgTable("production_notifications", {
  id: serial("id").primaryKey(),
  jobCardId: integer("job_card_id").notNull(),
  recipientId: varchar("recipient_id").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // assignment, completion, revision
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
  communications: many(communications),
  jobCardsAsPhotographer: many(jobCards, { relationName: "photographerJobs" }),
  jobCardsAsEditor: many(jobCards, { relationName: "editorJobs" }),
  productionNotifications: many(productionNotifications),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  bookings: many(bookings),
  communications: many(communications),
  jobCards: many(jobCards),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  client: one(clients, {
    fields: [bookings.clientId],
    references: [clients.id],
  }),
  photographer: one(users, {
    fields: [bookings.photographerId],
    references: [users.id],
  }),
  mediaFiles: many(mediaFiles),
  qaChecklist: one(qaChecklists, {
    fields: [bookings.id],
    references: [qaChecklists.bookingId],
  }),
  communications: many(communications),
  jobCard: one(jobCards, {
    fields: [bookings.id],
    references: [jobCards.bookingId],
  }),
}));

export const mediaFilesRelations = relations(mediaFiles, ({ one }) => ({
  booking: one(bookings, {
    fields: [mediaFiles.bookingId],
    references: [bookings.id],
  }),
}));

export const qaChecklistsRelations = relations(qaChecklists, ({ one }) => ({
  booking: one(bookings, {
    fields: [qaChecklists.bookingId],
    references: [bookings.id],
  }),
}));

export const communicationsRelations = relations(communications, ({ one }) => ({
  client: one(clients, {
    fields: [communications.clientId],
    references: [clients.id],
  }),
  booking: one(bookings, {
    fields: [communications.bookingId],
    references: [bookings.id],
  }),
  user: one(users, {
    fields: [communications.userId],
    references: [users.id],
  }),
}));

// Job Cards relations
export const jobCardsRelations = relations(jobCards, ({ one, many }) => ({
  booking: one(bookings, {
    fields: [jobCards.bookingId],
    references: [bookings.id],
  }),
  client: one(clients, {
    fields: [jobCards.clientId],
    references: [clients.id],
  }),
  photographer: one(users, {
    fields: [jobCards.photographerId],
    references: [users.id],
    relationName: "photographerJobs",
  }),
  editor: one(users, {
    fields: [jobCards.editorId],
    references: [users.id],
    relationName: "editorJobs",
  }),
  productionFiles: many(productionFiles),
  notifications: many(productionNotifications),
}));

// Production Files relations
export const productionFilesRelations = relations(productionFiles, ({ one }) => ({
  jobCard: one(jobCards, {
    fields: [productionFiles.jobCardId],
    references: [jobCards.id],
  }),
  uploadedByUser: one(users, {
    fields: [productionFiles.uploadedBy],
    references: [users.id],
  }),
}));

// Production Notifications relations
export const productionNotificationsRelations = relations(productionNotifications, ({ one }) => ({
  jobCard: one(jobCards, {
    fields: [productionNotifications.jobCardId],
    references: [jobCards.id],
  }),
  recipient: one(users, {
    fields: [productionNotifications.recipientId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  role: true,
  licenseeId: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMediaFileSchema = createInsertSchema(mediaFiles).omit({
  id: true,
  uploadedAt: true,
});

export const insertQaChecklistSchema = createInsertSchema(qaChecklists).omit({
  id: true,
  completedAt: true,
});

export const insertCommunicationSchema = createInsertSchema(communications).omit({
  id: true,
  timestamp: true,
});

export const insertJobCardSchema = createInsertSchema(jobCards).omit({
  id: true,
  jobId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductionFileSchema = createInsertSchema(productionFiles).omit({
  id: true,
  uploadedAt: true,
});

export const insertProductionNotificationSchema = createInsertSchema(productionNotifications).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertMediaFile = z.infer<typeof insertMediaFileSchema>;
export type MediaFile = typeof mediaFiles.$inferSelect;
export type InsertQaChecklist = z.infer<typeof insertQaChecklistSchema>;
export type QaChecklist = typeof qaChecklists.$inferSelect;
export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;
export type Communication = typeof communications.$inferSelect;

// Production workflow types
export type InsertJobCard = z.infer<typeof insertJobCardSchema>;
export type JobCard = typeof jobCards.$inferSelect;
export type InsertProductionFile = z.infer<typeof insertProductionFileSchema>;
export type ProductionFile = typeof productionFiles.$inferSelect;
export type InsertProductionNotification = z.infer<typeof insertProductionNotificationSchema>;
export type ProductionNotification = typeof productionNotifications.$inferSelect;
