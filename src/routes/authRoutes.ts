import { Router } from 'express';
import { login, registerBranchAdmin, registerTrainer, registerMember, registerSuperAdmin, getMe } from '../controllers/authController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and user registration
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login any user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login
 *       401:
 *         description: Invalid credentials
 */

/**
 * @swagger
 * /auth/register-branch-admin:
 *   post:
 *     summary: SuperAdmin creates BranchAdmin
 *     tags: [Auth]
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
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: BranchAdmin registered
 *       400:
 *         description: Email already in use
 */

/**
 * @swagger
 * /auth/register-trainer:
 *   post:
 *     summary: BranchAdmin creates Trainer
 *     tags: [Auth]
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
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Trainer registered
 *       400:
 *         description: Email already in use
 */

/**
 * @swagger
 * /auth/register-member:
 *   post:
 *     summary: Register new Member
 *     tags: [Auth]
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
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Member registered
 *       400:
 *         description: Email already in use
 */

/**
 * @swagger
 * /auth/register-superadmin:
 *   post:
 *     summary: Register a SuperAdmin
 *     tags: [Auth]
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
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: SuperAdmin registered
 *       400:
 *         description: Email already in use
 */

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Unauthorized
 */

const router = Router();

router.post('/login', login);
router.post('/register-branch-admin', authenticateJWT, authorizeRoles('SuperAdmin'), registerBranchAdmin);
router.post('/register-trainer', authenticateJWT, authorizeRoles('BranchAdmin'), registerTrainer);
router.post('/register-member', registerMember);
router.post('/register-superadmin', authenticateJWT, authorizeRoles('SuperAdmin'), registerSuperAdmin);
router.get('/me', authenticateJWT, getMe);

export default router; 