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
export const userRoleEnum = pgEnum("user_role", ["admin", "photographer", "va", "licensee"]);

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
  licenseeId: varchar("licensee_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Service types enum
export const serviceTypeEnum = pgEnum("service_type", ["photography", "drone", "floor_plans", "video"]);

// Job status enum
export const jobStatusEnum = pgEnum("job_status", ["pending", "confirmed", "in_progress", "completed", "cancelled"]);

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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
  communications: many(communications),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  bookings: many(bookings),
  communications: many(communications),
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
