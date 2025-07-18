import { Router } from 'express';
import { listTrainers, listMembers, getUserProfile, updateUserProfile, deleteUser } from '../controllers/userController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Trainer and member management
 */

/**
 * @swagger
 * /users/trainers:
 *   get:
 *     summary: List all trainers (optionally filter by branch)
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: integer
 *         required: false
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: List of trainers
 */

/**
 * @swagger
 * /users/members:
 *   get:
 *     summary: List all members (optionally filter by branch)
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: integer
 *         required: false
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: List of members
 */

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: User profile
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update a user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted
 *       404:
 *         description: User not found
 */

const router = Router();

router.get('/trainers', listTrainers);
router.get('/members', listMembers);
router.get('/:id', getUserProfile);
router.put('/:id', authenticateJWT, authorizeRoles('SuperAdmin', 'BranchAdmin'), updateUserProfile);
router.delete('/:id', authenticateJWT, authorizeRoles('SuperAdmin', 'BranchAdmin'), deleteUser);

export default router; 