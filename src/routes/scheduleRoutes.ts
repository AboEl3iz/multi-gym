import { Router } from 'express';
import { createSchedule, getSchedules, getSchedule, updateSchedule, deleteSchedule } from '../controllers/scheduleController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

/**
 * @swagger
 * tags:
 *   name: Schedules
 *   description: Class session scheduling
 */

/**
 * @swagger
 * /schedules:
 *   get:
 *     summary: List schedules (filter by branch, trainer, room, or class)
 *     tags: [Schedules]
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: integer
 *         required: false
 *         description: Branch ID
 *       - in: query
 *         name: trainerId
 *         schema:
 *           type: integer
 *         required: false
 *         description: Trainer ID
 *       - in: query
 *         name: roomId
 *         schema:
 *           type: integer
 *         required: false
 *         description: Room ID
 *       - in: query
 *         name: classId
 *         schema:
 *           type: integer
 *         required: false
 *         description: Class ID
 *     responses:
 *       200:
 *         description: List of schedules
 */

/**
 * @swagger
 * /schedules/{id}:
 *   get:
 *     summary: Get schedule details
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Schedule ID
 *     responses:
 *       200:
 *         description: Schedule details
 *       404:
 *         description: Schedule not found
 */

/**
 * @swagger
 * /schedules:
 *   post:
 *     summary: Create a schedule (class session)
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               classId:
 *                 type: integer
 *               roomId:
 *                 type: integer
 *               trainerId:
 *                 type: integer
 *               branchId:
 *                 type: integer
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Schedule created
 *       409:
 *         description: Schedule conflict detected
 */

/**
 * @swagger
 * /schedules/{id}:
 *   put:
 *     summary: Update a schedule
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Schedule ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               classId:
 *                 type: integer
 *               roomId:
 *                 type: integer
 *               trainerId:
 *                 type: integer
 *               branchId:
 *                 type: integer
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Schedule updated
 *       404:
 *         description: Schedule not found
 *       409:
 *         description: Schedule conflict detected
 */

/**
 * @swagger
 * /schedules/{id}:
 *   delete:
 *     summary: Delete a schedule
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Schedule ID
 *     responses:
 *       200:
 *         description: Schedule deleted
 *       404:
 *         description: Schedule not found
 */

const router = Router();

router.get('/', getSchedules);
router.get('/:id', getSchedule);
router.post('/', authenticateJWT, authorizeRoles('SuperAdmin', 'BranchAdmin'), createSchedule);
router.put('/:id', authenticateJWT, authorizeRoles('SuperAdmin', 'BranchAdmin'), updateSchedule);
router.delete('/:id', authenticateJWT, authorizeRoles('SuperAdmin', 'BranchAdmin'), deleteSchedule);

export default router; 