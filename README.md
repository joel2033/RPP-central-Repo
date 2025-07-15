# RealEstate Media Pro

A comprehensive real estate media franchise management platform that streamlines operations from client management to job delivery.

## 🚀 Features

- **Client Management**: Full CRM with contact management and editing preferences
- **Booking System**: 4-step booking flow with service selection and scheduling
- **Production Workflow**: Complete job tracking from assignment to delivery
- **Calendar Integration**: Google Calendar sync for photographer scheduling
- **Delivery System**: Branded public delivery pages with download tracking
- **Product Management**: Dynamic service selection with pricing variants
- **User Roles**: Admin, Photographer, VA, Licensee, and Editor access levels

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling and development
- **TailwindCSS** for styling
- **Radix UI** for accessible components
- **TanStack Query** for state management
- **Wouter** for routing

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **Drizzle ORM** with PostgreSQL
- **Replit Auth** for authentication
- **Google Calendar API** integration

### Database
- **PostgreSQL** via Neon serverless
- **Drizzle ORM** for schema management
- **Multi-tenant** architecture with licensee isolation

## 📁 Project Structure

```
├── client/src/
│   ├── components/
│   │   ├── common/          # Reusable components
│   │   ├── layout/          # Layout components
│   │   ├── modals/          # Modal components
│   │   ├── optimized/       # Performance-optimized components
│   │   └── ui/              # UI primitives
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities and configuration
│   ├── pages/               # Page components
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Utility functions
├── server/
│   ├── controllers/         # Route controllers
│   ├── middleware/          # Express middleware
│   ├── routes/              # API routes
│   ├── utils/               # Server utilities
│   └── ...                  # Core server files
└── shared/
    └── schema.ts           # Shared database schema
```

## 🛠️ Development

### Prerequisites
- Node.js 20+
- PostgreSQL database
- Google Calendar API credentials (optional)

### Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   # Required
   DATABASE_URL=your_postgresql_url
   SESSION_SECRET=your_session_secret
   
   # Optional
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

3. **Run database migrations**:
   ```bash
   npm run db:push
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

## 🔐 Authentication

The application uses Replit Auth with OpenID Connect for authentication. User sessions are stored in PostgreSQL with role-based access control.

### User Roles
- **Admin**: Full system access
- **Licensee**: Franchise owner access
- **Photographer**: Field staff access
- **VA**: Virtual assistant access
- **Editor**: Media editing access

## 📊 Performance Optimizations

### Frontend
- **React.memo** for component memoization
- **useCallback** and **useMemo** for expensive operations
- **Virtual scrolling** for large lists
- **Debounced search** with custom hooks
- **Query caching** with TanStack Query

### Backend
- **Request validation** with Zod schemas
- **Database query optimization** with Drizzle ORM
- **Error handling** middleware
- **Response caching** for static data

### Database
- **Indexed queries** for performance
- **Connection pooling** with Neon
- **Data isolation** by licenseeId

## 🚀 Deployment

The application is designed for deployment on Replit with automatic builds and deployments.

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Google Calendar credentials set up
- [ ] File storage configured
- [ ] Error monitoring enabled

## 📝 API Documentation

### Authentication
All API endpoints require authentication except public delivery pages.

### Rate Limiting
API requests are rate-limited to prevent abuse.

### Error Handling
Standardized error responses with proper HTTP status codes.

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run type checking
npm run type-check

# Run linting
npm run lint
```

## 📈 Monitoring

- Application logs via console
- Performance monitoring with built-in utilities
- Error tracking and reporting

## 🤝 Contributing

1. Follow TypeScript best practices
2. Use proper component naming conventions
3. Add proper error handling
4. Update documentation for new features
5. Test thoroughly before deployment

## 📄 License

This project is proprietary software for RealEstate Media Pro.

## 🔮 Future Enhancements

- Mobile app development
- Advanced analytics dashboard
- Automated billing system
- Marketing automation
- API rate limiting
- Real-time notifications
- Advanced reporting
- Multi-language support# RPP-central-Repo
