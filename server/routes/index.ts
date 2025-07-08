import { Router } from 'express';
import clientRoutes from './clientRoutes';
import jobRoutes from './jobRoutes';
import bookingRoutes from './bookingRoutes';
import productRoutes from './productRoutes';
import { errorHandler, notFoundHandler } from '../utils/errorHandler';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
router.use('/clients', clientRoutes);
// router.use('/jobs', jobRoutes);
// router.use('/bookings', bookingRoutes);
// router.use('/products', productRoutes);

// 404 handler for API routes
router.use('*', notFoundHandler);

// Error handler
router.use(errorHandler);

export default router;