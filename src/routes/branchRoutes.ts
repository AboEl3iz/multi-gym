import { Router } from 'express';
import { getBranches, getBranch, createBranch, updateBranch, deleteBranch, assignTrainer, assignMember, getBranchTrainers, getBranchMembers, assignBranchAdmin, getBranchAdmins } from '../controllers/branchController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

/**
 * @swagger
 * tags:
 *   name: Branches
 *   description: Branch management and assignments
 */

/**
 * @swagger
 * /branches:
 *   get:
 *     summary: List all branches
 *     tags: [Branches]
 *     responses:
 *       200:
 *         description: List of branches
 */

/**
 * @swagger
 * /branches/{id}:
 *   get:
 *     summary: Get branch details
 *     tags: [Branches]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Branch details
 *       404:
 *         description: Branch not found
 */

/**
 * @swagger
 * /branches:
 *   post:
 *     summary: Create a new branch
 *     tags: [Branches]
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
 *               address:
 *                 type: string
 *     responses:
 *       201:
 *         description: Branch created
 *       403:
 *         description: Forbidden
 */

/**
 * @swagger
 * /branches/{id}:
 *   put:
 *     summary: Update branch info
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Branch ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Branch updated
 *       404:
 *         description: Branch not found
 */

/**
 * @swagger
 * /branches/{id}:
 *   delete:
 *     summary: Delete a branch
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Branch deleted
 *       404:
 *         description: Branch not found
 */

/**
 * @swagger
 * /branches/{id}/assign-branch-admin:
 *   post:
 *     summary: Assign a Branch Admin to a branch
 *     tags: [Branches]
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
 *     responses:
 *       200:
 *         description: BranchAdmin assigned
 *       404:
 *         description: BranchAdmin not found
 */

/**
 * @swagger
 * /branches/{id}/assign-trainer:
 *   post:
 *     summary: Assign a Trainer to a branch
 *     tags: [Branches]
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
 *     responses:
 *       200:
 *         description: Trainer assigned
 *       404:
 *         description: Trainer not found
 */

/**
 * @swagger
 * /branches/{id}/assign-member:
 *   post:
 *     summary: Assign a Member to a branch
 *     tags: [Branches]
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
 *     responses:
 *       200:
 *         description: Member assigned
 *       404:
 *         description: Member not found
 */

/**
 * @swagger
 * /branches/{id}/admins:
 *   get:
 *     summary: List Branch Admins for a branch
 *     tags: [Branches]
 *     responses:
 *       200:
 *         description: List of Branch Admins
 */

/**
 * @swagger
 * /branches/{id}/trainers:
 *   get:
 *     summary: List Trainers for a branch
 *     tags: [Branches]
 *     responses:
 *       200:
 *         description: List of Trainers
 */

/**
 * @swagger
 * /branches/{id}/members:
 *   get:
 *     summary: List Members for a branch
 *     tags: [Branches]
 *     responses:
 *       200:
 *         description: List of Members
 */

const router = Router();

router.get('/', getBranches);
router.get('/:id', getBranch);
router.post('/', authenticateJWT, authorizeRoles('SuperAdmin'), createBranch);
router.put('/:id', authenticateJWT, authorizeRoles('SuperAdmin'), updateBranch);
router.delete('/:id', authenticateJWT, authorizeRoles('SuperAdmin'), deleteBranch);
router.post('/:id/assign-trainer', authenticateJWT, authorizeRoles('SuperAdmin'), assignTrainer);
router.post('/:id/assign-member', authenticateJWT, authorizeRoles('SuperAdmin'), assignMember);
router.post('/:id/assign-branch-admin', authenticateJWT, authorizeRoles('SuperAdmin'), assignBranchAdmin);
router.get('/:id/trainers', getBranchTrainers);
router.get('/:id/members', getBranchMembers);
router.get('/:id/admins', getBranchAdmins);

export default router; 