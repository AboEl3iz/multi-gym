import { Router } from 'express';
import { branchAdminDashboard, superAdminDashboard } from '../controllers/dashboardController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Admin and SuperAdmin dashboards
 */

/**
 * @swagger
 * /dashboard/admin:
 *   get:
 *     summary: Branch Admin dashboard (branch stats)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Branch dashboard data
 *       403:
 *         description: No branch assigned
 */

/**
 * @swagger
 * /dashboard/superadmin:
 *   get:
 *     summary: Super Admin dashboard (global stats)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SuperAdmin dashboard data
 */

const router = Router();

router.get('/admin', authenticateJWT, authorizeRoles('BranchAdmin'), branchAdminDashboard);
router.get('/superadmin', authenticateJWT, authorizeRoles('SuperAdmin'), superAdminDashboard);

export default router; 