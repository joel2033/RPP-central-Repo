# RealEstate Media Pro

## Overview

RealEstate Media Pro is a comprehensive real estate media franchise management platform that streamlines operations from client management to job delivery. The application provides a unified system for managing clients, bookings, photographer assignments, job tracking, and media delivery for real estate media businesses.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **UI Components**: Radix UI primitives with shadcn/ui components
- **Styling**: Tailwind CSS with custom design system
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite with custom configuration for development and production

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL storage
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **API Pattern**: RESTful API with middleware-based request handling

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
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```