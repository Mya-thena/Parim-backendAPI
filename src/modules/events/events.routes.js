const express = require('express');
const router = express.Router();

const eventsController = require('./events.controller');
const rolesController = require('./roles.controller');
const participantsController = require('./participants.controller');

const { protect, restrictTo } = require('../../middlewares/rbac.middleware');

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Event management endpoints
 */

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - shortDescription
 *               - longDescription
 *               - eventDate
 *               - location
 *             properties:
 *               title:
 *                 type: string
 *               shortDescription:
 *                 type: string
 *               longDescription:
 *                 type: string
 *               bannerImage:
 *                 type: string
 *               eventDate:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                     format: date-time
 *                   end:
 *                     type: string
 *                     format: date-time
 *               location:
 *                 type: object
 *                 properties:
 *                   venue:
 *                     type: string
 *                   address:
 *                     type: string
 *                   state:
 *                     type: string
 *     responses:
 *       201:
 *         description: Event created successfully
 */
router.post(
    '/',
    protect,
    restrictTo('admin'),
    eventsController.createEvent
);

/**
 * @swagger
 * /api/events/{eventId}/status:
 *   patch:
 *     summary: Update event status
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, published, closed]
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.patch(
    '/:eventId/status',
    protect,
    restrictTo('admin'),
    eventsController.updateEventStatus
);

/**
 * @swagger
 * /api/events/{eventId}:
 *   patch:
 *     summary: Update event details
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               shortDescription:
 *                 type: string
 *               longDescription:
 *                 type: string
 *               bannerImage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Event updated successfully
 */
router.patch(
    '/:eventId',
    protect,
    restrictTo('admin'),
    eventsController.updateEvent
);

/**
 * @swagger
 * /api/events/{eventId}:
 *   delete:
 *     summary: Safe delete event (Admin only)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event deleted successfully
 */
router.delete(
    '/:eventId',
    protect,
    restrictTo('admin'),
    eventsController.deleteEvent
);

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: List events (Staff sees published, Admin filters)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, closed]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of events
 */
router.get(
    '/',
    protect,
    eventsController.listEvents
);

/**
 * @swagger
 * /api/events/unique/{uniqueId}:
 *   get:
 *     summary: Get event by public unique ID
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uniqueId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event details
 */
router.get(
    '/unique/:uniqueId',
    protect,
    eventsController.getEventByUniqueId
);

// ==========================================
// ROLE ROUTES
// ==========================================

/**
 * @swagger
 * /api/events/{eventId}/roles:
 *   post:
 *     summary: Add role to event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roleName
 *               - price
 *               - capacity
 *             properties:
 *               roleName:
 *                 type: string
 *               roleDescription:
 *                 type: string
 *               price:
 *                 type: number
 *               capacity:
 *                 type: integer
 *               duration:
 *                 type: string
 *     responses:
 *       201:
 *         description: Role created successfully
 */
router.post(
    '/:eventId/roles',
    protect,
    restrictTo('admin'),
    rolesController.createRole
);

/**
 * @swagger
 * /api/events/{eventId}/roles:
 *   get:
 *     summary: List roles for an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of roles
 */
router.get(
    '/:eventId/roles',
    protect,
    rolesController.listRoles
);

/**
 * @swagger
 * /api/events/roles/{roleId}:
 *   patch:
 *     summary: Update role details
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roleName:
 *                 type: string
 *               price:
 *                 type: number
 *               capacity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Role updated successfully
 */
router.patch(
    '/roles/:roleId',
    protect,
    restrictTo('admin'),
    rolesController.updateRole
);

/**
 * @swagger
 * /api/events/roles/{roleId}:
 *   delete:
 *     summary: Safe delete role
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role deleted successfully
 */
router.delete(
    '/roles/:roleId',
    protect,
    restrictTo('admin'),
    rolesController.deleteRole
);

// ==========================================
// PARTICIPANT ROUTES
// ==========================================

/**
 * @swagger
 * /api/events/{eventId}/apply:
 *   post:
 *     summary: Apply for a role in an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roleId
 *             properties:
 *               roleId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Application submitted successfully
 */
router.post(
    '/:eventId/apply',
    protect,
    restrictTo('user'), // Explicitly only users (staff) can apply
    participantsController.applyToEvent
);

/**
 * @swagger
 * /api/events/{eventId}/participants:
 *   get:
 *     summary: List participants for an event (Admin)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of participants
 */
router.get(
    '/:eventId/participants',
    protect,
    restrictTo('admin'),
    participantsController.listParticipants
);

/**
 * @swagger
 * /api/events/{eventId}/participants/change-role:
 *   patch:
 *     summary: Change applied role (Pre-approval)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newRoleId
 *             properties:
 *               newRoleId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Role changed successfully
 */
router.patch(
    '/:eventId/participants/change-role',
    protect,
    restrictTo('user'),
    participantsController.changeRole
);

/**
 * @swagger
 * /api/events/{eventId}/participants/withdraw:
 *   delete:
 *     summary: Withdraw application
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Application withdrawn
 */
router.delete(
    '/:eventId/participants/withdraw',
    protect,
    restrictTo('user'),
    participantsController.withdrawApplication
);

/**
 * @swagger
 * /api/events/participants/{participantId}/approve:
 *   patch:
 *     summary: Approve participant (Admin)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: participantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Participant approved
 */
router.patch(
    '/participants/:participantId/approve',
    protect,
    restrictTo('admin'),
    participantsController.approveParticipant
);

/**
 * @swagger
 * /api/events/participants/{participantId}/reject:
 *   patch:
 *     summary: Reject participant (Admin)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: participantId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Participant rejected
 */
router.patch(
    '/participants/:participantId/reject',
    protect,
    restrictTo('admin'),
    participantsController.rejectParticipant
);

module.exports = router;
