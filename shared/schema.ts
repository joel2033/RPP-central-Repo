import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  json,
  index,
  serial,
  integer,
  decimal,
  boolean,
  date,
  pgEnum,
  uuid,
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

// Offices/Agencies table
export const offices = pgTable("offices", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  website: varchar("website", { length: 255 }),
  contactName: varchar("contact_name", { length: 255 }),
  notes: text("notes"),
  licenseeId: varchar("licensee_id").notNull(),
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
  officeId: integer("office_id"), // Reference to offices table
  licenseeId: varchar("licensee_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Service types enum
export const serviceTypeEnum = pgEnum("service_type", ["photography", "drone", "floor_plans", "video"]);

// Job status enum
export const jobStatusEnum = pgEnum("job_status", ["pending", "confirmed", "in_progress", "completed", "cancelled"]);

// Production workflow enums
export const jobCardStatusEnum = pgEnum("job_card_status", ["unassigned", "pending", "in_progress", "editing", "ready_for_qc", "in_revision", "delivered", "cancelled"]);
export const mediaTypeEnum = pgEnum("media_type", ["raw", "edited", "final"]);
export const serviceCategoryEnum = pgEnum("service_category", ["photography", "floor_plan", "drone", "video"]);

// Job status enum - extended for better tracking 
export const jobStatusExtendedEnum = pgEnum("job_status_extended", [
  "upcoming", "booked", "in_progress", "editing", "ready_for_qc", 
  "in_revision", "delivered", "completed", "cancelled"
]);

// Bookings table
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  propertyAddress: text("property_address").notNull(),
  scheduledDate: date("scheduled_date").notNull(),
  scheduledTime: varchar("scheduled_time", { length: 10 }),
  services: serviceTypeEnum("services").array().notNull(),
  selectedProducts: jsonb("selected_products").default([]),
  status: jobStatusEnum("status").default("pending"),
  photographerId: varchar("photographer_id"),
  notes: text("notes"),
  price: decimal("price", { precision: 10, scale: 2 }),
  licenseeId: varchar("licensee_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Media files table
// Enhanced Media Files table for RAW upload tracking
export const mediaFiles = pgTable("media_files", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id"), // Link to job card instead of booking
  bookingId: integer("booking_id"), // Keep for backward compatibility
  address: text("address"), // Property address from job
  uploaderId: varchar("uploader_id"), // Track who uploaded the file
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull(),
  fileUrl: text("file_url").notNull(),
  s3Key: text("s3_key"), // S3 object key
  fileSize: integer("file_size"),
  contentType: varchar("content_type", { length: 100 }), // MIME type
  mediaType: mediaTypeEnum("media_type"), // raw, finished
  serviceType: serviceTypeEnum("service_type").notNull(),
  uploadTimestamp: timestamp("upload_timestamp").defaultNow(),
  licenseeId: varchar("licensee_id"), // For access control
  isActive: boolean("is_active").default(true),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// Global Job ID Counter table for atomic ID generation
export const jobIdCounter = pgTable("job_id_counter", {
  id: serial("id").primaryKey(),
  currentValue: integer("current_value").notNull().default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Job Cards table (Production workflow)
export const jobCards = pgTable("job_cards", {
  id: serial("id").primaryKey(),
  jobId: varchar("job_id", { length: 50 }).unique(), // Generated job ID - NULL until assigned
  bookingId: integer("booking_id").notNull(),
  clientId: integer("client_id").notNull(),
  photographerId: varchar("photographer_id"),
  editorId: varchar("editor_id"),
  status: jobCardStatusEnum("status").default("unassigned"),
  jobStatus: jobStatusExtendedEnum("job_status").default("upcoming"), // User-facing job status
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
  filePath: text("file_path"), // Keep for backward compatibility
  s3Key: text("s3_key"), // S3 object key
  s3Bucket: varchar("s3_bucket", { length: 255 }), // S3 bucket name
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  mediaType: mediaTypeEnum("media_type").notNull(), // raw, edited, final
  serviceCategory: serviceCategoryEnum("service_category").notNull(),
  uploadedBy: varchar("uploaded_by").notNull(),
  instructions: text("instructions"),
  exportType: varchar("export_type", { length: 100 }),
  customDescription: text("custom_description"),
  metadata: jsonb("metadata"), // Additional metadata for completion tracking
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// Editor Service Pricing tables
export const editorServiceCategories = pgTable("editor_service_categories", {
  id: serial("id").primaryKey(),
  editorId: varchar("editor_id").notNull(),
  categoryName: varchar("category_name", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const editorServiceOptions = pgTable("editor_service_options", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  optionName: varchar("option_name", { length: 255 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("AUD"),
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Service Templates for admins to create default templates
export const serviceTemplates = pgTable("service_templates", {
  id: serial("id").primaryKey(),
  templateName: varchar("template_name", { length: 255 }).notNull(),
  templateData: jsonb("template_data").$type<{
    categories: Array<{
      categoryName: string;
      displayOrder: number;
      options: Array<{
        optionName: string;
        price: number;
        currency: string;
        displayOrder: number;
      }>;
    }>;
  }>().notNull(),
  createdBy: varchar("created_by").notNull(),
  isDefault: boolean("is_default").default(false),
  licenseeId: varchar("licensee_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Change logs for service modifications
export const editorServiceChangeLogs = pgTable("editor_service_change_logs", {
  id: serial("id").primaryKey(),
  editorId: varchar("editor_id").notNull(),
  changeType: varchar("change_type", { length: 50 }).notNull(), // 'category_added', 'option_modified', 'price_changed', etc.
  categoryId: integer("category_id"),
  optionId: integer("option_id"),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  changedBy: varchar("changed_by").notNull(),
  changeReason: text("change_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Order status audit log for tracking status changes
export const orderStatusAudit = pgTable("order_status_audit", {
  id: serial("id").primaryKey(),
  jobCardId: integer("job_card_id").notNull(),
  previousStatus: varchar("previous_status", { length: 50 }),
  newStatus: varchar("new_status", { length: 50 }).notNull(),
  changedBy: varchar("changed_by").notNull(),
  changeReason: text("change_reason"),
  metadata: jsonb("metadata"), // Additional context about the change
  createdAt: timestamp("created_at").defaultNow(),
});

// Email delivery log for tracking client communications
export const emailDeliveryLog = pgTable("email_delivery_log", {
  id: serial("id").primaryKey(),
  jobCardId: integer("job_card_id").notNull(),
  recipientEmail: varchar("recipient_email").notNull(),
  emailType: varchar("email_type", { length: 50 }).notNull(), // delivery_notification, completion_notice
  emailStatus: varchar("email_status", { length: 20 }).notNull(), // sent, failed, pending
  deliveredAt: timestamp("delivered_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});



// Activity Log table for job tracking
export const jobActivityLog = pgTable("job_activity_log", {
  id: serial("id").primaryKey(),
  jobCardId: integer("job_card_id").notNull(),
  userId: varchar("user_id").notNull(),
  action: varchar("action", { length: 100 }).notNull(), // booking_created, files_uploaded, sent_to_editor, delivered, revision_requested, etc.
  description: text("description").notNull(),
  metadata: jsonb("metadata"), // Additional context data
  createdAt: timestamp("created_at").defaultNow(),
});

// Calendar Events table (Photographer availability and business settings)
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // job, unavailable, external, holiday
  start: timestamp("start").notNull(),
  end: timestamp("end").notNull(),
  allDay: boolean("all_day").default(false),
  photographerId: varchar("photographer_id"),
  bookingId: integer("booking_id"),
  color: varchar("color", { length: 7 }), // hex color
  description: text("description"),
  licenseeId: varchar("licensee_id").notNull(),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Business Settings table
export const businessSettings = pgTable("business_settings", {
  id: serial("id").primaryKey(),
  licenseeId: varchar("licensee_id").notNull().unique(),
  businessHours: jsonb("business_hours").notNull(), // {mon: {start: "08:00", end: "18:00"}, ...}
  minimumNoticeHours: integer("minimum_notice_hours").default(24),
  bufferTimeBetweenJobs: integer("buffer_time_minutes").default(30),
  defaultJobDuration: integer("default_job_duration_minutes").default(120),
  timezone: varchar("timezone", { length: 100 }).default("America/New_York"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Google Calendar Integration table
export const googleCalendarIntegrations = pgTable("google_calendar_integrations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  googleCalendarId: varchar("google_calendar_id").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenExpiry: timestamp("token_expiry").notNull(),
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  syncDirection: varchar("sync_direction", { length: 20 }).default("both"), // inbound, outbound, both
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Calendar Sync Log table (for tracking sync events)
export const calendarSyncLogs = pgTable("calendar_sync_logs", {
  id: serial("id").primaryKey(),
  integrationId: integer("integration_id").notNull().references(() => googleCalendarIntegrations.id),
  eventId: varchar("event_id"), // Our internal event ID
  googleEventId: varchar("google_event_id"), // Google's event ID
  syncType: varchar("sync_type", { length: 20 }).notNull(), // push, pull, update, delete
  status: varchar("status", { length: 20 }).notNull(), // success, error, pending
  errorMessage: text("error_message"),
  syncedAt: timestamp("synced_at").defaultNow(),
});

// Delivery Comments table
export const deliveryComments = pgTable("delivery_comments", {
  id: serial("id").primaryKey(),
  jobCardId: integer("job_card_id").notNull(),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientEmail: varchar("client_email", { length: 255 }).notNull(),
  comment: text("comment").notNull(),
  requestRevision: boolean("request_revision").default(false),
  adminResponse: text("admin_response"),
  status: varchar("status").default("pending"), // 'pending', 'responded', 'resolved'
  createdAt: timestamp("created_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
});

// Delivery Tracking table
export const deliveryTracking = pgTable("delivery_tracking", {
  id: serial("id").primaryKey(),
  jobCardId: integer("job_card_id").notNull(),
  actionType: varchar("action_type").notNull(), // 'page_view', 'file_download', 'bulk_download'
  fileName: varchar("file_name"), // For file downloads
  clientInfo: jsonb("client_info"), // IP, user agent, etc.
  timestamp: timestamp("timestamp").defaultNow(),
});

// Job Card Delivery Settings table
export const jobCardDeliverySettings = pgTable("job_card_delivery_settings", {
  id: serial("id").primaryKey(),
  jobCardId: integer("job_card_id").notNull().unique(),
  headerImageFileId: integer("header_image_file_id"), // Reference to ProductionFile
  enableComments: boolean("enable_comments").default(true),
  enableDownloads: boolean("enable_downloads").default(true),
  customMessage: text("custom_message"),
  deliveryUrl: varchar("delivery_url").unique(), // Custom URL slug
  isPublic: boolean("is_public").default(true),
  passwordProtected: boolean("password_protected").default(false),
  deliveryPassword: varchar("delivery_password"),
  sectionOrder: jsonb("section_order").$type<string[]>().default(['photos', 'floor_plans', 'video', 'virtual_tour', 'other_files']),
  sectionVisibility: jsonb("section_visibility").$type<Record<string, boolean>>().default({
    photos: true,
    floor_plans: true,
    video: true,
    virtual_tour: true,
    other_files: true
  }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Content ID Counter table for generating unique content IDs
export const contentIdCounter = pgTable("content_id_counter", {
  id: serial("id").primaryKey(),
  currentId: integer("current_id").notNull().default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Content Items table for job card content management
export const contentItemsStatusEnum = pgEnum("content_items_status", ["draft", "ready_for_qc", "approved", "delivered", "in_revision"]);
export const uploaderRoleEnum = pgEnum("uploader_role", ["editor", "photographer", "admin"]);
export const contentTypeEnum = pgEnum("content_type", ["finished", "raw", "temp"]);

export const contentItems = pgTable("content_items", {
  id: serial("id").primaryKey(),
  jobCardId: integer("job_card_id").notNull(),
  contentId: varchar("content_id", { length: 10 }).unique(), // e.g., "01268" - 5-digit content-specific ID
  category: serviceCategoryEnum("category").notNull(), // photos, floor_plans, video, virtual_tour, other
  name: varchar("name", { length: 255 }).notNull(), // e.g., "#01376 Images ON"
  description: text("description"),
  isEditable: boolean("is_editable").default(true),
  isActive: boolean("is_active").default(true),
  status: contentItemsStatusEnum("status").default("draft"),
  fileCount: integer("file_count").default(0),
  s3Urls: jsonb("s3_urls").$type<string[]>().default([]), // Array of S3 URLs
  thumbUrl: varchar("thumb_url", { length: 500 }), // Thumbnail S3 URL
  displayOrder: integer("display_order").default(0),
  uploaderRole: uploaderRoleEnum("uploader_role").default("editor"), // Track who uploaded this content
  type: contentTypeEnum("type").default("finished"), // Track content type
  createdBy: varchar("created_by").notNull(),
  updatedBy: varchar("updated_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
  communications: many(communications),
  jobCardsAsPhotographer: many(jobCards, { relationName: "photographerJobs" }),
  jobCardsAsEditor: many(jobCards, { relationName: "editorJobs" }),
  productionNotifications: many(productionNotifications),
}));

// Office relations
export const officesRelations = relations(offices, ({ many }) => ({
  clients: many(clients),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  office: one(offices, {
    fields: [clients.officeId],
    references: [offices.id],
  }),
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
  jobCard: one(jobCards, {
    fields: [mediaFiles.jobId],
    references: [jobCards.id],
  }),
  uploader: one(users, {
    fields: [mediaFiles.uploaderId],
    references: [users.id],
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
  deliveryComments: many(deliveryComments),
  deliveryTracking: many(deliveryTracking),
  deliverySettings: one(jobCardDeliverySettings),
  contentItems: many(contentItems),
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

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  photographer: one(users, {
    fields: [calendarEvents.photographerId],
    references: [users.id],
  }),
  booking: one(bookings, {
    fields: [calendarEvents.bookingId],
    references: [bookings.id],
  }),
}));

export const businessSettingsRelations = relations(businessSettings, ({ one }) => ({
  licensee: one(users, {
    fields: [businessSettings.licenseeId],
    references: [users.id],
  }),
}));

export const googleCalendarIntegrationsRelations = relations(googleCalendarIntegrations, ({ one, many }) => ({
  user: one(users, {
    fields: [googleCalendarIntegrations.userId],
    references: [users.id],
  }),
  syncLogs: many(calendarSyncLogs),
}));

export const calendarSyncLogsRelations = relations(calendarSyncLogs, ({ one }) => ({
  integration: one(googleCalendarIntegrations, {
    fields: [calendarSyncLogs.integrationId],
    references: [googleCalendarIntegrations.id],
  }),
}));

// Delivery relations
export const deliveryCommentsRelations = relations(deliveryComments, ({ one }) => ({
  jobCard: one(jobCards, {
    fields: [deliveryComments.jobCardId],
    references: [jobCards.id],
  }),
}));

export const deliveryTrackingRelations = relations(deliveryTracking, ({ one }) => ({
  jobCard: one(jobCards, {
    fields: [deliveryTracking.jobCardId],
    references: [jobCards.id],
  }),
}));

export const jobCardDeliverySettingsRelations = relations(jobCardDeliverySettings, ({ one }) => ({
  jobCard: one(jobCards, {
    fields: [jobCardDeliverySettings.jobCardId],
    references: [jobCards.id],
  }),
  headerImageFile: one(productionFiles, {
    fields: [jobCardDeliverySettings.headerImageFileId],
    references: [productionFiles.id],
  }),
}));

// Content Items relations
export const contentItemsRelations = relations(contentItems, ({ one }) => ({
  jobCard: one(jobCards, {
    fields: [contentItems.jobCardId],
    references: [jobCards.id],
  }),
  createdByUser: one(users, {
    fields: [contentItems.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [contentItems.updatedBy],
    references: [users.id],
  }),
}));

// Editor Service Pricing relations
export const editorServiceCategoriesRelations = relations(editorServiceCategories, ({ one, many }) => ({
  editor: one(users, {
    fields: [editorServiceCategories.editorId],
    references: [users.id],
  }),
  options: many(editorServiceOptions),
}));

export const editorServiceOptionsRelations = relations(editorServiceOptions, ({ one }) => ({
  category: one(editorServiceCategories, {
    fields: [editorServiceOptions.categoryId],
    references: [editorServiceCategories.id],
  }),
}));

export const serviceTemplatesRelations = relations(serviceTemplates, ({ one }) => ({
  creator: one(users, {
    fields: [serviceTemplates.createdBy],
    references: [users.id],
  }),
}));

export const editorServiceChangeLogsRelations = relations(editorServiceChangeLogs, ({ one }) => ({
  editor: one(users, {
    fields: [editorServiceChangeLogs.editorId],
    references: [users.id],
  }),
  changedBy: one(users, {
    fields: [editorServiceChangeLogs.changedBy],
    references: [users.id],
  }),
  category: one(editorServiceCategories, {
    fields: [editorServiceChangeLogs.categoryId],
    references: [editorServiceCategories.id],
  }),
  option: one(editorServiceOptions, {
    fields: [editorServiceChangeLogs.optionId],
    references: [editorServiceOptions.id],
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

export const insertOfficeSchema = createInsertSchema(offices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBusinessSettingsSchema = createInsertSchema(businessSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGoogleCalendarIntegrationSchema = createInsertSchema(googleCalendarIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCalendarSyncLogSchema = createInsertSchema(calendarSyncLogs).omit({
  id: true,
  syncedAt: true,
});

export const insertDeliveryCommentSchema = createInsertSchema(deliveryComments).omit({
  id: true,
  createdAt: true,
  respondedAt: true,
});

export const insertDeliveryTrackingSchema = createInsertSchema(deliveryTracking).omit({
  id: true,
  timestamp: true,
});

export const insertJobCardDeliverySettingsSchema = createInsertSchema(jobCardDeliverySettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Editor Service Pricing schemas
export const insertEditorServiceCategorySchema = createInsertSchema(editorServiceCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEditorServiceOptionSchema = createInsertSchema(editorServiceOptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceTemplateSchema = createInsertSchema(serviceTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEditorServiceChangeLogSchema = createInsertSchema(editorServiceChangeLogs).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertOffice = z.infer<typeof insertOfficeSchema>;
export type Office = typeof offices.$inferSelect;
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

export type InsertJobActivityLog = typeof jobActivityLog.$inferInsert;
export type JobActivityLog = typeof jobActivityLog.$inferSelect;

// Calendar types
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertBusinessSettings = z.infer<typeof insertBusinessSettingsSchema>;
export type BusinessSettings = typeof businessSettings.$inferSelect;
export type InsertGoogleCalendarIntegration = z.infer<typeof insertGoogleCalendarIntegrationSchema>;
export type GoogleCalendarIntegration = typeof googleCalendarIntegrations.$inferSelect;
export type InsertCalendarSyncLog = z.infer<typeof insertCalendarSyncLogSchema>;
export type CalendarSyncLog = typeof calendarSyncLogs.$inferSelect;

// Delivery types
export type InsertDeliveryComment = z.infer<typeof insertDeliveryCommentSchema>;
export type DeliveryComment = typeof deliveryComments.$inferSelect;
export type InsertDeliveryTracking = z.infer<typeof insertDeliveryTrackingSchema>;
export type DeliveryTracking = typeof deliveryTracking.$inferSelect;
export type InsertJobCardDeliverySettings = z.infer<typeof insertJobCardDeliverySettingsSchema>;
export type JobCardDeliverySettings = typeof jobCardDeliverySettings.$inferSelect;

// Editor Service Pricing types
export type InsertEditorServiceCategory = z.infer<typeof insertEditorServiceCategorySchema>;
export type EditorServiceCategory = typeof editorServiceCategories.$inferSelect;
export type InsertEditorServiceOption = z.infer<typeof insertEditorServiceOptionSchema>;
export type EditorServiceOption = typeof editorServiceOptions.$inferSelect;
export type InsertServiceTemplate = z.infer<typeof insertServiceTemplateSchema>;
export type ServiceTemplate = typeof serviceTemplates.$inferSelect;
export type InsertEditorServiceChangeLog = z.infer<typeof insertEditorServiceChangeLogSchema>;
export type EditorServiceChangeLog = typeof editorServiceChangeLogs.$inferSelect;

// Products
export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(), // 'product' | 'package' | 'addon'
  description: text("description"),
  image: text("image"), // URL or file path
  category: text("category"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  taxRate: text("tax_rate").notNull().default("GST 10%"), // 'GST 10%' | '0%' | etc
  variations: jsonb("variations").default([]), // Array of variation objects
  isDigital: boolean("is_digital").default(true),
  requiresOnsite: boolean("requires_onsite").default(false),
  exclusiveClients: text("exclusive_clients").array().default([]),
  isActive: boolean("is_active").default(true),
  showOnBookingForm: boolean("show_on_booking_form").default(false),
  showOnCustomerBookingForm: boolean("show_on_customer_booking_form").default(false),
  licenseeId: text("licensee_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Product schemas
export const insertProductSchema = createInsertSchema(products).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// Product types
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Add missing schema types for audit tables
export const insertOrderStatusAuditSchema = createInsertSchema(orderStatusAudit).omit({
  id: true,
  createdAt: true,
});

export const insertEmailDeliveryLogSchema = createInsertSchema(emailDeliveryLog).omit({
  id: true,
  createdAt: true,
});

// Add missing types for audit tables
export type InsertOrderStatusAudit = z.infer<typeof insertOrderStatusAuditSchema>;
export type OrderStatusAudit = typeof orderStatusAudit.$inferSelect;
export type InsertEmailDeliveryLog = z.infer<typeof insertEmailDeliveryLogSchema>;
export type EmailDeliveryLog = typeof emailDeliveryLog.$inferSelect;

// Job ID Counter schemas and types
export const insertJobIdCounterSchema = createInsertSchema(jobIdCounter).omit({
  id: true,
  lastUpdated: true,
});

export type InsertJobIdCounter = z.infer<typeof insertJobIdCounterSchema>;
export type JobIdCounter = typeof jobIdCounter.$inferSelect;

// Content Items schemas and types
export const insertContentItemSchema = createInsertSchema(contentItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertContentItem = z.infer<typeof insertContentItemSchema>;
export type ContentItem = typeof contentItems.$inferSelect;
