# RealEstate Media Pro

## Overview

RealEstate Media Pro is a comprehensive real estate media franchise management platform that streamlines operations from client management to job delivery. The application provides a unified system for managing clients, bookings, photographer assignments, job tracking, and media delivery for real estate media businesses.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and modern hooks (memo, useCallback, useMemo)
- **Routing**: Wouter for client-side routing with performance optimizations
- **State Management**: TanStack Query v5 with optimized caching and custom hooks
- **UI Components**: Radix UI primitives with shadcn/ui components and shared reusable components
- **Styling**: Tailwind CSS with custom design system and responsive utilities
- **Form Handling**: React Hook Form with Zod validation and debounced inputs
- **Build Tool**: Vite with custom configuration, hot module replacement, and production optimization
- **Performance**: Virtual scrolling, memoization, throttling, and memory management utilities

### Backend Architecture
- **Runtime**: Node.js with Express.js and optimized middleware stack
- **Language**: TypeScript with ES modules and comprehensive type safety
- **Authentication**: Replit Auth with OpenID Connect and role-based access control
- **Session Management**: Express sessions with PostgreSQL storage and connection pooling
- **Database ORM**: Drizzle ORM with PostgreSQL dialect and query optimization
- **API Pattern**: RESTful API with modular controllers, validation middleware, and error handling
- **Performance**: Request caching, memoized queries, and response optimization
- **Error Handling**: Centralized error middleware with proper HTTP status codes and logging

### Database Architecture
- **Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM with schema-first approach
- **Migrations**: Drizzle Kit for database schema management
- **Connection**: Neon serverless with WebSocket support

## Key Components

### Authentication System
- **Provider**: Replit Auth with OIDC
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **Authorization**: Role-based access control with user roles (admin, photographer, va, licensee)
- **Data Isolation**: Licensee-based data segregation for multi-tenant support

### Data Models
- **Users**: Profile management with role-based permissions
- **Clients**: CRM functionality with contact and project history
- **Bookings**: Scheduling system with service type selection
- **Media Files**: File management and delivery tracking
- **QA Checklists**: Quality assurance workflow management
- **Communications**: Client communication history tracking

### Service Management
- **Photography**: Standard real estate photography services
- **Drone**: Aerial photography and videography
- **Floor Plans**: Property layout documentation
- **Video**: Property showcase and marketing videos

### User Interface
- **Dashboard**: Overview of business metrics and recent activity
- **Client Management**: Full CRM with client profiles and history
- **Booking System**: Scheduling and service selection interface
- **Job Tracking**: Progress monitoring from booking to delivery
- **Delivery Portal**: Client access to completed media files
- **Reports**: Business analytics and performance tracking

## Data Flow

### Authentication Flow
1. User initiates login via Replit Auth
2. OIDC provider validates credentials
3. Session created and stored in PostgreSQL
4. User profile retrieved or created
5. Role-based access permissions applied

### Booking Management Flow
1. Client booking request created
2. Services selected and scheduled
3. Photographer assigned (if applicable)
4. Job status tracking initiated
5. Media upload and QA process
6. Client delivery and communication

### Data Isolation
- All data operations filtered by licenseeId
- Role-based access controls enforce data boundaries
- Multi-tenant architecture supports franchise operations

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless driver
- **drizzle-orm**: Database ORM and query builder
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: Accessible UI component primitives
- **wouter**: Lightweight React routing
- **react-hook-form**: Form state management
- **zod**: Runtime type validation

### Development Dependencies
- **vite**: Frontend build tool and development server
- **tailwindcss**: Utility-first CSS framework
- **typescript**: Type checking and development experience
- **tsx**: TypeScript execution for development

### Authentication Dependencies
- **openid-client**: OIDC authentication client
- **passport**: Authentication middleware
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store

## Deployment Strategy

### Development Environment
- **Frontend**: Vite dev server with hot module replacement
- **Backend**: tsx with file watching for TypeScript execution
- **Database**: Neon serverless PostgreSQL with connection pooling

### Production Build
- **Frontend**: Vite production build with optimization
- **Backend**: esbuild bundling for Node.js deployment
- **Static Assets**: Served from Express with proper caching headers

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (required)
- **SESSION_SECRET**: Session encryption key (required)
- **REPLIT_DOMAINS**: Allowed domains for OIDC (required)
- **ISSUER_URL**: OIDC provider URL (optional, defaults to Replit)

## Changelog

```
Changelog:
- July 07, 2025. Initial setup
- July 07, 2025. Fixed critical application errors:
  - Resolved SelectItem component error by adding fallback values
  - Fixed nested anchor tag warnings in sidebar navigation
  - Cleaned up duplicate CSS declarations causing HMR failures
  - Improved database connection configuration with better timeouts
  - Confirmed booking feature functionality and UI improvements
- July 07, 2025. Implemented comprehensive Production Module:
  - Added job cards with automatic generation from bookings
  - Created production workflow with status tracking (unassigned → in_progress → editing → ready_for_qa → delivered)
  - Built Production Interface for internal staff to assign editors
  - Implemented Editor Dashboard for job management and file uploads
  - Created QA Review Queue for approval/revision workflow
  - Added notification system for workflow handoffs
  - Extended database schema with job cards, production files, and notifications
  - Added user roles for editors and comprehensive API endpoints
  - Redesigned sidebar navigation with collapsible menu sections:
    * Production Hub (Upload to Editor, Editor Dashboard, QA Review, Revisions Queue)
    * Clients (CRM, Client Preferences)
    * Bookings (Calendar, New Booking)
    * Reports (Analytics, Revenue)
    * Settings (General, User Management)
  - Enhanced UI with modern collapsible navigation and user profile section
  - Built comprehensive "Upload to Editor" page with modern order form design:
    * Progressive form flow: Job Selection → Editor Selection → Services → Service Blocks
    * Dynamic service blocks with quantity controls, file uploads, and export types
    * Multi-file upload support with drag-and-drop interface
    * Detailed instructions and custom export type descriptions
    * Professional card-based layout matching modern UI patterns
    * Integration with job card system for seamless workflow handoffs
  - Created dedicated Editor Portal with role-based access control:
    * Separate dashboard for editors with restricted access
    * Role-based routing that redirects non-editors to main app
    * Editor-specific job card API endpoints with proper authorization
    * Download raw files, upload final files, and job completion workflow
    * Clean editor interface with job statistics and status management
    * Secure file download and upload functionality for editor workflow
- July 07, 2025. Added comprehensive Calendar Module with Google Calendar integration:
  - Implemented FullCalendar with Month/Week/Day views and photographer availability management
  - Built two-way Google Calendar synchronization with OAuth integration
  - Added business settings for hours configuration and scheduling rules
  - Created event management with color-coded types (Jobs, Unavailable, External, Holidays)
  - Fixed navigation bugs: Production Hub dropdown now only expands when directly clicked
  - Enhanced button responsiveness with proper event handling and hover effects
  - Resolved SelectItem errors and improved overall UI interaction reliability
- July 07, 2025. Built comprehensive Jobs Module for client-facing job management:
  - Created Jobs list page with filtering (All/Upcoming/Delivered/In Revision) and search functionality
  - Extended database schema with job activity logging and enhanced job status tracking
  - Added API endpoints: GET /api/jobs, /api/jobs/:id, /api/jobs/:id/files, /api/jobs/:id/activity
  - Implemented automatic job creation from bookings with proper workflow integration
  - Jobs display property address, client details, photographer assignments, and service lists
  - Enhanced sidebar navigation: moved Jobs under Clients section, separated Bookings, Calendar standalone
  - Ready for detailed job card view with file management and activity tracking features
- July 07, 2025. Completed full booking-to-job-to-calendar integration:
  - Fixed authentication issue in Jobs API (using req.user.claims.sub for proper user identification)
  - Successfully integrated booking creation with automatic job card generation and calendar event creation
  - Jobs page displays all job cards with proper layout (fixed sidebar overlap with ml-64 margin)
  - Complete workflow: Booking Created → Job Card Generated → Calendar Event Added → Activity Logged
  - Database verification confirms job cards, bookings, and calendar events are properly linked
  - Jobs list shows 6 job cards with booking details, client information, and service types
  - Navigation menu and job filtering/search functionality working correctly
- July 07, 2025. Comprehensive Job Card detail page implementation:
  - Built complete job detail page with header, customer info, appointment details, billing info
  - Added file management with tabbed layout (Photos, Floor Plans, Video, Virtual Tour, Other)
  - Implemented expandable activity log with user avatars and timestamps
  - Fixed navigation between Jobs list and Job Detail pages with proper routing
  - Added Google Maps integration for property addresses
  - Resolved data loading issues and added proper error handling
- July 07, 2025. Renamed "QA Review" to "Pre-Delivery Check" across application:
  - Updated sidebar menu, job workflow status labels, and all UI references
  - Added proper permission controls (Admin and VA access only)
  - Maintained all existing functionality with new terminology
  - Updated job status displays throughout editor dashboard, production pages, and job cards
- July 07, 2025. Built comprehensive branded Delivery Page system with full client functionality:
  - **Public Delivery Pages**: Created branded client-facing pages accessible via /delivery/{jobID} with no login required
  - **Dynamic Content**: Header banner image selection, tile gallery for photos, floor plans display, video/virtual tour sections
  - **Client Feedback System**: Comment forms with revision request functionality that triggers "In Revision" status and activity logging
  - **Download Tracking**: Complete view/download tracking with IP logging, file-specific tracking, and bulk download options
  - **Delivery Settings Modal**: Admin interface for configuring delivery pages with header image selection, custom messages, feature toggles
  - **Database Extensions**: Added delivery_comments, delivery_tracking, and job_card_delivery_settings tables with full relations
  - **API Endpoints**: Public delivery routes (/api/delivery/*) and authenticated settings routes with proper data isolation
  - **Responsive Design**: Mobile-friendly interface with professional branding, file previews, and interactive galleries
  - **Security Features**: Optional password protection, public/private toggle, custom URL slugs for branded delivery links
  - **Activity Integration**: Client comments automatically create job activity logs and update job status for revision workflow
  - **Admin Dashboard**: Delivery management page showing all jobs with delivery status, quick link copying, and setup shortcuts
  - **Complete Integration**: Seamlessly integrated with existing job card system, file management, and production workflow
- July 07, 2025. Added section reordering and visibility controls for delivery pages:
  - **Drag-and-Drop Interface**: Section reorder component with up/down controls for Photos, Floor Plans, Video, Virtual Tour, Other Files
  - **Custom Section Order**: Database storage of custom section order with default fallback (Photos → Floor Plans → Video → Virtual Tour → Other Files)
  - **Visibility Toggle**: Admin ability to hide sections per job with simple checkbox controls in job card UI
  - **Dynamic Rendering**: Public delivery pages now respect custom section order and visibility settings
  - **Database Extension**: Added sectionOrder and sectionVisibility JSON fields to job_card_delivery_settings table
  - **Admin Interface**: Integrated section reorder component into job detail pages with live preview
  - **Flexible Layout**: Each job can have unique section arrangement and visibility for customized client presentation
- July 07, 2025. Enhanced navigation workflow and user experience improvements:
  - **Removed Sidebar "New Booking"**: Cleaned up sidebar navigation by removing direct booking creation link
  - **Added Quick Actions Menu**: Top-right "+ New" dropdown button for faster access to core functions
  - **Multi-Step Booking Modal**: Created progressive 3-step booking form (Job Information → Appointment Details → Order Summary)
  - **Enhanced Client Modal**: Added collapsible sections including new "Editing Preferences" field for client-specific instructions
  - **Client Editing Preferences**: New database field that auto-fills into job cards for consistent editing requirements
  - **Modern UI Patterns**: Card-based layouts, progress indicators, step navigation, and summary previews
  - **Email Confirmation Toggle**: Default "Send client confirmation email" option in booking creation
  - **Streamlined Workflow**: Modal-based forms replace full-page navigation for better UX
  - **Auto-refresh Integration**: Job and client lists automatically update after modal form submissions
  - **Professional Layout**: Google Maps placeholder, service selection cards, and comprehensive order summaries
- July 08, 2025. Completed 4-step booking flow with full Product Management integration:
  - **Fixed Product Variant Selection**: Variants now display and update pricing correctly using array indices
  - **Dynamic Service Selection**: Product Management API integration with automatic price calculation from variants
  - **4-Step Booking Flow**: Client Info → Service Selection → Date/Time/Photographer → Order Summary → Create Job
  - **Product-to-Service Mapping**: Intelligent mapping of product titles to service enum values (photography, drone, floor_plans, video)
  - **Form Validation Fix**: Resolved service validation issues by mapping product IDs to valid service types
  - **Price Field Updates**: Form price automatically syncs with selected product variants
  - **API Request Resolution**: Fixed parameter order in apiRequest function for successful booking creation
  - **Complete Integration**: Booking modal now creates jobs with proper service types, product details, and pricing
  - **Customer Booking Toggle**: Added showOnCustomerBookingForm field for future customer portal separation
  - **Workflow Prevention**: Fixed automatic form submission to ensure all 4 steps are properly navigated
- July 08, 2025. Enhanced date and time picker components with modern UI and functionality:
  - **Modern Date Picker**: Implemented react-day-picker with calendar UI, month/year navigation, and proper date formatting
  - **Advanced Time Picker**: Created dropdown with 15-minute intervals, proper AM/PM formatting, and smooth scrolling
  - **Cross-Browser Scrolling**: Fixed time picker scroll behavior with mouse wheel and trackpad support across all browsers
  - **Calendar Event Integration**: Fixed time parsing for calendar event creation, resolving "Invalid time value" errors
  - **Auto-Scroll Feature**: Time picker automatically scrolls to current time when opened for better UX
  - **Professional Styling**: Custom scrollbars, smooth animations, and responsive design matching existing UI theme
  - **Form Integration**: Seamless integration with React Hook Form and Zod validation for Step 3 appointment scheduling
- July 08, 2025. Comprehensive codebase optimization for performance, readability, and modularity:
  - **Frontend Architecture Overhaul**: Implemented React performance patterns with React.memo, useCallback, and useMemo throughout
  - **Component Organization**: Created views/ folder structure separating page-level components from reusable UI components
  - **Shared Components Library**: Built reusable ErrorBoundary, AsyncBoundary, Modal, ConfirmDialog, and FormField components
  - **Custom Hooks**: Enhanced useAsyncOperation, useConfirmDialog, useIntersectionObserver, and useVirtualization for common patterns
  - **Performance Optimization**: Added LazyImage with intersection observer, VirtualizedList for large data sets, and memory management utilities
  - **Backend Service Layer**: Implemented modular service architecture with ClientService and JobService for business logic separation
  - **API Enhancement**: Created RESTful controllers with proper validation, error handling, and response standardization
  - **Security Middleware**: Added comprehensive security headers, rate limiting, input sanitization, and request size validation
  - **Caching Strategy**: Implemented in-memory caching with automatic invalidation for improved API performance
  - **Type Safety**: Enhanced TypeScript definitions with comprehensive API types and proper error handling patterns
  - **File Structure**: Reorganized into scalable architecture with views/, services/, controllers/, and middleware/ folders
  - **Code Quality**: Implemented consistent naming conventions, removed unused imports, and standardized component patterns
  - **Error Handling**: Added async operation handling, error boundaries, and graceful failure patterns throughout the application
- July 08, 2025. Major navigation refactoring for cleaner, flatter sidebar structure:
  - **Flattened Navigation**: Converted nested dropdowns to standalone navigation items for improved UX
  - **Sidebar Restructure**: Dashboard, Customers, Calendar, and Jobs are now top-level standalone buttons
  - **Production Hub Cleanup**: Removed "Pre-Delivery Check" and "Revisions", added new "Order Status" page
  - **Profile Dropdown**: Centralized user settings in top-bar dropdown with role-based menu items
  - **Settings Migration**: Moved "Delivery Settings" and "Admin Settings" from sidebar to profile dropdown
  - **Role-Based Visibility**: Profile dropdown shows different options based on user role (admin, licensee, va, photographer, editor)
  - **New Pages**: Created My Profile and Business Settings placeholder pages with modern layouts
  - **Order Status Page**: Built production tracking interface with job status cards and progress indicators
  - **Navigation Logic**: Updated sidebar rendering to handle both standalone items and collapsible sections
  - **User Experience**: Reduced cognitive load with fewer nested menus and clearer navigation hierarchy
- July 08, 2025. Built modern Customer Profile view with CRM-style two-column layout:
  - **Two-Column Design**: Created professional customer profile page matching modern CRM interface standards
  - **Customer Metrics Dashboard**: Implemented real-time calculation of Total Sales, Average Job Value, and Total Jobs from actual data
  - **Job History Table**: Built comprehensive job listing with search functionality and status filtering capabilities
  - **Enhanced Navigation**: Added "View Profile" button to client cards for seamless navigation to detailed customer view
  - **Customer Information Panel**: Displays avatar with initials, contact details, agency information, and customer preferences
  - **Notes and Team Management**: Created infrastructure for customer notes modal and team member management (prepared for DB migration)
  - **Job Actions Integration**: Linked job history to existing job detail pages with proper routing and status display
  - **Responsive Design**: Mobile-friendly interface with card-based layout and proper spacing throughout
  - **Database Compatibility**: Built to work with existing schema while preparing foundation for enhanced customer features
  - **Search and Filter**: Implemented real-time job search by address/ID and filtering by job status
- July 08, 2025. Completed action-based status system with custom StatusPill component:
  - **Removed "Complete" Status**: Simplified workflow to use only "delivered" status instead of separate "complete" and "delivered" states
  - **Custom StatusPill Component**: Created dedicated component with user-specified colors (gray, yellow, blue, red, green) for clean status display
  - **Action-Based Workflow**: Implemented role-based action buttons (Accept Job, Mark Ready for QC) with delivery/revision actions moved to job card level
  - **Database Compatibility**: Built backward-compatible system that works with existing schema while preparing for future timestamp-based tracking
  - **Legacy Status Support**: System gracefully handles both new action-based status calculation and existing status fields
  - **Production Interface**: Enhanced Order Status page with StatusPill display and functional action buttons for streamlined workflow management
  - **Database Query Optimization**: Fixed column selection to work with current schema while avoiding non-existent timestamp fields
  - **Status Tab Layout**: Updated from 7-column to 6-column tab layout removing "Complete" section for cleaner interface
  - **Status Filtering Fixes**: Resolved filtering logic issues and tab count accuracy across all status categories
  - **StatusPill Improvements**: Fixed text wrapping with proper padding and whitespace-nowrap for consistent single-line display
  - **Test Data Creation**: Added comprehensive test job cards across all status types for validation and demonstration
  - **Streamlined Actions**: Removed "Deliver to Client" and "Request Revision" buttons from status level - these will be implemented within individual job cards
- July 08, 2025. Fixed critical Customer Profile and Client Modal runtime errors:
  - **Customer Profile Runtime Fixes**: Resolved "Invalid time value" errors with enhanced date validation and null checking
  - **Client Modal API Corrections**: Fixed apiRequest parameter order (method, url, data) for both creation and update operations
  - **Data Safety Enhancements**: Added comprehensive null checks for job arrays, property addresses, and pricing data
  - **Form Validation Updates**: Fixed client form schema to exclude ID field for new client creation
  - **API Layer Consistency**: Updated all clientApi, jobApi, and bookingApi functions to use consistent async/await patterns
  - **Customer Profile Features**: Successfully implemented two-column CRM layout with metrics dashboard and job history
  - **Complete Functionality**: Customer Profile "View" button, "Add Client", and "Edit Client" buttons now working properly
  - **Error Handling**: Enhanced formatDate function with proper validation and graceful fallbacks for invalid dates
- July 08, 2025. Integrated office management into Clients page with hierarchical organization system:
  - **Removed Standalone Offices Page**: Eliminated separate offices navigation and integrated functionality into Clients page
  - **Tabbed Interface**: Created two-tab system (Clients/Offices) within the Clients page for unified management
  - **Office Selection in Client Forms**: Added dropdown menu for office assignment during client creation and editing
  - **Client Card Office Display**: Client cards now show assigned office information with building icon
  - **Extended Office Schema**: Prepared database schema for billing details, branding materials, floor plan templates, and drone labels
  - **Database Migration**: Successfully recreated offices table with proper foreign key constraints
  - **Office Management UI**: Built office cards with contact information, edit functionality, and empty state handling
  - **Query Integration**: Added office data fetching to client cards for displaying office associations
  - **Navigation Cleanup**: Removed offices from sidebar menu and integrated into client workflow seamlessly
- July 08, 2025. Implemented global Job ID system with lifetime-unique numeric identifiers:
  - **Global Job ID Counter**: Created atomic counter table for safe, lifetime-unique Job ID generation (00001, 00002, etc.)
  - **Job ID Assignment Logic**: Job IDs are NOT created at job card creation - only assigned when uploaded to editor
  - **JobIdService**: Built centralized service for atomic Job ID generation and assignment with database transactions
  - **API Endpoints**: Added /assign-job-id, /has-job-id, and /job-id-counter routes for Job ID management
  - **File Upload Protection**: Modified file upload system to prevent uploads without Job ID assignment
  - **Automatic Assignment**: Job IDs are automatically assigned when editors are assigned to jobs (status: in_progress)
  - **JobIdBadge Component**: Created reusable component displaying Job ID status with assignment functionality
  - **UI Integration**: Updated job cards, order status pages, and file upload dialogs to show Job ID badges
  - **Database Schema Updates**: Modified job_cards table to make jobId nullable and added job_id_counter table
  - **Editor Workflow**: Job IDs are visible to editors and prevent content upload without assignment
  - **Lifetime Uniqueness**: Counter never resets, ensuring no duplicate Job IDs across the entire system
- July 09, 2025. Fixed critical Order Status page runtime error:
  - **Search Filter Fix**: Resolved null reference error where jobId.toLowerCase() was called on null values
  - **Null Safety**: Added proper null checking for jobId, client name, and property address in search functionality
  - **Import Fix**: Added missing getOrderStatus function import from shared utilities
  - **Job ID Badge Integration**: Order Status page now displays Job ID badges with proper "No Job ID" status and assignment functionality
  - **Search Functionality**: Safe search filtering now works correctly with null Job IDs and supports searching by Job ID, client name, and property address
  - **Status Display**: StatusPill component properly handles both timestamp-based and legacy status systems
- July 10, 2025. Completed fully functional editor-specific service pricing module:
  - **Editor Dashboard Integration**: Moved service pricing from admin dashboard to editor dashboard with tabbed interface
  - **Service Category Management**: Editors can create, edit, and delete their own service categories with proper form validation
  - **Pricing Option Management**: Each category supports multiple pricing options with currency selection and active status toggles
  - **Database Schema**: Four-table system (categories, options, pricing, change logs) with proper foreign key relationships
  - **API Layer**: Complete RESTful API endpoints for CRUD operations on editor services with role-based permissions
  - **Real-time Updates**: Automatic cache invalidation and UI refresh after data mutations using TanStack Query
  - **Data Integrity Fix**: Resolved API response parsing issue where Response objects were returned instead of JSON data
  - **Service Structure Display**: Categories display as individual sections with dropdown-style pricing options matching user requirements
  - **Change Tracking**: Full audit trail of pricing changes with timestamps and reason logging for business compliance
- July 10, 2025. Successfully integrated editor service categories into Upload to Editor workflow:
  - **Dynamic Service Selection**: Replaced hardcoded services with editor-specific categories fetched from database
  - **Individual Category Cards**: Each service category displays as a separate card with checkbox selection
  - **Pricing Option Dropdowns**: Selected categories show dropdown menus with editor's custom pricing options
  - **Field Mapping Fix**: Corrected categoryName and optionName field mapping for proper data display
  - **Independent Selection**: Fixed checkbox logic to allow individual category selection without affecting others
  - **Real-time Loading**: Added loading states and empty states for editor service categories
  - **Service Block Integration**: Updated service blocks to store category IDs and selected pricing options
  - **Complete Workflow**: Upload to Editor page now fully integrates with editor's custom service pricing structure
  - **Fully Functional**: Confirmed working pricing option selection with proper service block creation and dropdown functionality
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```