import { Router } from 'express';
import { generateReport, getReport, listReports, exportReportPDF } from '../controllers/reportController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Reports and analytics
 */

/**
 * @swagger
 * /reports:
 *   post:
 *     summary: Generate a report (attendance, by branch/period)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               branchId:
 *                 type: integer
 *               type:
 *                 type: string
 *               period:
 *                 type: string
 *                 example: '2024-05'
 *     responses:
 *       201:
 *         description: Report generated
 *       404:
 *         description: Branch not found
 */

/**
 * @swagger
 * /reports:
 *   get:
 *     summary: List reports (optionally filter by branch)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: integer
 *         required: false
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: List of reports
 */

/**
 * @swagger
 * /reports/{id}:
 *   get:
 *     summary: Get report details
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Report ID
 *     responses:
 *       200:
 *         description: Report details
 *       404:
 *         description: Report not found
 */

/**
 * @swagger
 * /reports/{id}/pdf:
 *   get:
 *     summary: Export report as PDF (stub)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Report ID
 *     responses:
 *       501:
 *         description: PDF export not implemented
 */

const router = Router();

router.post('/', authenticateJWT, authorizeRoles('SuperAdmin', 'BranchAdmin'), generateReport);
router.get('/', authenticateJWT, authorizeRoles('SuperAdmin', 'BranchAdmin'), listReports);
router.get('/:id', authenticateJWT, authorizeRoles('SuperAdmin', 'BranchAdmin'), getReport);
router.get('/:id/pdf', authenticateJWT, authorizeRoles('SuperAdmin', 'BranchAdmin'), exportReportPDF);

export default router; 