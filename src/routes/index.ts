import { Router } from 'express';
import authRoutes from './authRoutes';
import branchRoutes from './branchRoutes';
import userRoutes from './userRoutes';
import classRoutes from './classRoutes';
import roomRoutes from './roomRoutes';
import scheduleRoutes from './scheduleRoutes';
import bookingRoutes from './bookingRoutes';
import reportRoutes from './reportRoutes';
import offerRoutes from './offerRoutes';
import chatRoutes from './chatRoutes';
import notificationRoutes from './notificationRoutes';
import dashboardRoutes from './dashboardRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/branches', branchRoutes);
router.use('/users', userRoutes);
router.use('/classes', classRoutes);
router.use('/rooms', roomRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/bookings', bookingRoutes);
router.use('/reports', reportRoutes);
router.use('/offers', offerRoutes);
router.use('/chat', chatRoutes);
router.use('/notifications', notificationRoutes);
router.use('/dashboard', dashboardRoutes);

export default router; 