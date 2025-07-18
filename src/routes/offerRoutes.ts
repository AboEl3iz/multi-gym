import { Router } from 'express';
import { createOffer, getOffers, getOffer, updateOffer, deleteOffer } from '../controllers/offerController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

/**
 * @swagger
 * tags:
 *   name: Offers
 *   description: Promotional offers and discounts
 */

/**
 * @swagger
 * /offers:
 *   get:
 *     summary: List active offers (optionally filter by branch)
 *     tags: [Offers]
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: integer
 *         required: false
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: List of offers
 */

/**
 * @swagger
 * /offers/{id}:
 *   get:
 *     summary: Get offer details
 *     tags: [Offers]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Offer ID
 *     responses:
 *       200:
 *         description: Offer details
 *       404:
 *         description: Offer not found
 */

/**
 * @swagger
 * /offers:
 *   post:
 *     summary: Create an offer
 *     tags: [Offers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               discount:
 *                 type: number
 *               type:
 *                 type: string
 *               branchId:
 *                 type: integer
 *               validFrom:
 *                 type: string
 *                 format: date-time
 *               validTo:
 *                 type: string
 *                 format: date-time
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Offer created
 *       404:
 *         description: Branch not found
 */

/**
 * @swagger
 * /offers/{id}:
 *   put:
 *     summary: Update an offer
 *     tags: [Offers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Offer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               discount:
 *                 type: number
 *               type:
 *                 type: string
 *               branchId:
 *                 type: integer
 *               validFrom:
 *                 type: string
 *                 format: date-time
 *               validTo:
 *                 type: string
 *                 format: date-time
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Offer updated
 *       404:
 *         description: Offer or branch not found
 */

/**
 * @swagger
 * /offers/{id}:
 *   delete:
 *     summary: Delete an offer
 *     tags: [Offers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Offer ID
 *     responses:
 *       200:
 *         description: Offer deleted
 *       404:
 *         description: Offer not found
 */

const router = Router();

router.get('/', getOffers);
router.get('/:id', getOffer);
router.post('/', authenticateJWT, authorizeRoles('SuperAdmin', 'BranchAdmin'), createOffer);
router.put('/:id', authenticateJWT, authorizeRoles('SuperAdmin', 'BranchAdmin'), updateOffer);
router.delete('/:id', authenticateJWT, authorizeRoles('SuperAdmin', 'BranchAdmin'), deleteOffer);

export default router; 