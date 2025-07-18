import { Router } from 'express';
import { bookSession, getMemberBookings, cancelBooking, getScheduleBookings, getBranchBookings, getTrainerSchedules, getBranchSchedules, markAttendance } from '../controllers/bookingController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Session booking and attendance
 */

/**
 * @swagger
 * /bookings/book:
 *   post:
 *     summary: Book a session (member)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scheduleId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Booking created
 *       400:
 *         description: Already booked
 *       404:
 *         description: Schedule or member not found
 */

/**
 * @swagger
 * /bookings/my:
 *   get:
 *     summary: View your bookings (member)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of bookings
 */

/**
 * @swagger
 * /bookings/{id}/cancel:
 *   post:
 *     summary: Cancel a booking (member)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking cancelled
 *       404:
 *         description: Booking not found
 *       403:
 *         description: Forbidden
 */

/**
 * @swagger
 * /bookings/{id}/attendance:
 *   post:
 *     summary: Mark attendance for a booking (trainer/admin)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [attended, missed]
 *     responses:
 *       200:
 *         description: Attendance marked
 *       404:
 *         description: Booking not found
 *       403:
 *         description: Forbidden
 */

/**
 * @swagger
 * /bookings/schedule/{scheduleId}:
 *   get:
 *     summary: Get all bookings for a schedule (admin/trainer)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scheduleId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Schedule ID
 *     responses:
 *       200:
 *         description: List of bookings
 */

/**
 * @swagger
 * /bookings/branch/{branchId}:
 *   get:
 *     summary: Get all bookings for a branch (admin)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: List of bookings
 */

/**
 * @swagger
 * /bookings/trainer/schedules:
 *   get:
 *     summary: Get all schedules for the logged-in trainer
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of schedules
 */

/**
 * @swagger
 * /bookings/branch/{branchId}/schedules:
 *   get:
 *     summary: Get all schedules for a branch (admin)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: List of schedules
 */

const router = Router();

router.post('/book', authenticateJWT, authorizeRoles('Member'), bookSession);
router.get('/my', authenticateJWT, authorizeRoles('Member'), getMemberBookings);
router.post('/:id/cancel', authenticateJWT, authorizeRoles('Member'), cancelBooking);
router.post('/:id/attendance', authenticateJWT, authorizeRoles('SuperAdmin', 'BranchAdmin', 'Trainer'), markAttendance);
router.get('/schedule/:scheduleId', authenticateJWT, authorizeRoles('SuperAdmin', 'BranchAdmin', 'Trainer'), getScheduleBookings);
router.get('/branch/:branchId', authenticateJWT, authorizeRoles('SuperAdmin', 'BranchAdmin'), getBranchBookings);
router.get('/trainer/schedules', authenticateJWT, authorizeRoles('Trainer'), getTrainerSchedules);
router.get('/branch/:branchId/schedules', authenticateJWT, authorizeRoles('SuperAdmin', 'BranchAdmin'), getBranchSchedules);

export default router; 