import { Router } from 'express';
import { createRoom, getRooms, getRoom, updateRoom, deleteRoom } from '../controllers/roomController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

/**
 * @swagger
 * tags:
 *   name: Rooms
 *   description: Room management
 */

/**
 * @swagger
 * /rooms:
 *   get:
 *     summary: List all rooms (optionally filter by branch)
 *     tags: [Rooms]
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: integer
 *         required: false
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: List of rooms
 */

/**
 * @swagger
 * /rooms/{id}:
 *   get:
 *     summary: Get room details
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Room details
 *       404:
 *         description: Room not found
 */

/**
 * @swagger
 * /rooms:
 *   post:
 *     summary: Create a new room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               branchId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Room created
 *       404:
 *         description: Branch not found
 */

/**
 * @swagger
 * /rooms/{id}:
 *   put:
 *     summary: Update a room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Room ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               branchId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Room updated
 *       404:
 *         description: Room or branch not found
 */

/**
 * @swagger
 * /rooms/{id}:
 *   delete:
 *     summary: Delete a room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Room deleted
 *       404:
 *         description: Room not found
 */

const router = Router();

router.get('/', getRooms);
router.get('/:id', getRoom);
router.post('/', authenticateJWT, authorizeRoles('SuperAdmin', 'BranchAdmin'), createRoom);
router.put('/:id', authenticateJWT, authorizeRoles('SuperAdmin', 'BranchAdmin'), updateRoom);
router.delete('/:id', authenticateJWT, authorizeRoles('SuperAdmin', 'BranchAdmin'), deleteRoom);

export default router; 