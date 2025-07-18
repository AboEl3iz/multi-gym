import { Router } from 'express';
import { listNotifications, markAsRead, createNotification } from '../controllers/notificationController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: User notifications
 */

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: List notifications for the logged-in user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 */

/**
 * @swagger
 * /notifications/{id}/read:
 *   post:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       404:
 *         description: Notification not found
 */

/**
 * @swagger
 * /notifications:
 *   post:
 *     summary: Create a notification (admin only) - sends email to user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: integer
 *                 description: ID of the user to notify
 *               message:
 *                 type: string
 *                 description: Notification message content
 *               type:
 *                 type: string
 *                 description: Type of notification (e.g., 'Booking', 'Schedule', 'General')
 *     responses:
 *       201:
 *         description: Notification created and email sent (if user has email)
 *       404:
 *         description: User not found
 */

const router = Router();

router.get('/', authenticateJWT, listNotifications);
router.post('/:id/read', authenticateJWT, markAsRead);
router.post('/', authenticateJWT, authorizeRoles('SuperAdmin', 'BranchAdmin'), createNotification);

export default router; 