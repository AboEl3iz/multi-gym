import { Router } from 'express';
import { createClass, getClasses, getClass, updateClass, deleteClass } from '../controllers/classController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

/**
 * @swagger
 * tags:
 *   name: Classes
 *   description: Gym class management
 */

/**
 * @swagger
 * /classes:
 *   get:
 *     summary: List all classes
 *     tags: [Classes]
 *     responses:
 *       200:
 *         description: List of classes
 */

/**
 * @swagger
 * /classes/{id}:
 *   get:
 *     summary: Get class details
 *     tags: [Classes]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Class ID
 *     responses:
 *       200:
 *         description: Class details
 *       404:
 *         description: Class not found
 */

/**
 * @swagger
 * /classes:
 *   post:
 *     summary: Create a new class
 *     tags: [Classes]
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
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Class created
 *       403:
 *         description: Forbidden
 */

/**
 * @swagger
 * /classes/{id}:
 *   put:
 *     summary: Update a class
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Class ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Class updated
 *       404:
 *         description: Class not found
 */

/**
 * @swagger
 * /classes/{id}:
 *   delete:
 *     summary: Delete a class
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Class ID
 *     responses:
 *       200:
 *         description: Class deleted
 *       404:
 *         description: Class not found
 */

const router = Router();

router.get('/', getClasses);
router.get('/:id', getClass);
router.post('/', authenticateJWT, authorizeRoles('SuperAdmin', 'BranchAdmin'), createClass);
router.put('/:id', authenticateJWT, authorizeRoles('SuperAdmin', 'BranchAdmin'), updateClass);
router.delete('/:id', authenticateJWT, authorizeRoles('SuperAdmin', 'BranchAdmin'), deleteClass);

export default router; 