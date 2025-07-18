import { Router } from 'express';
import { getDirectMessages, getBroadcastMessages, getUserMessages } from '../controllers/chatController';
import { authenticateJWT } from '../middlewares/authMiddleware';

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Real-time chat history endpoints
 */

/**
 * @swagger
 * /chat/direct/{userId}:
 *   get:
 *     summary: Get direct messages between the logged-in user and another user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Other user's ID
 *     responses:
 *       200:
 *         description: List of direct messages
 */

/**
 * @swagger
 * /chat/broadcasts:
 *   get:
 *     summary: Get all broadcast messages
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of broadcast messages
 */

/**
 * @swagger
 * /chat/my:
 *   get:
 *     summary: Get all messages involving the logged-in user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of messages
 */

const router = Router();

router.get('/direct/:userId', authenticateJWT, getDirectMessages);
router.get('/broadcasts', authenticateJWT, getBroadcastMessages);
router.get('/my', authenticateJWT, getUserMessages);

export default router; 