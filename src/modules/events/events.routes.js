const express = require('express');
const router = express.Router();

const eventsController = require('./events.controller');
const rolesController = require('./roles.controller');
const participantsController = require('./participants.controller');

const { protect, restrictTo } = require('../../middlewares/rbac.middleware');

// ==========================================
// EVENT ROUTES
// ==========================================

// Create Event (Admin Only)
router.post(
    '/',
    protect,
    restrictTo('admin'),
    eventsController.createEvent
);

// Update Status (Admin Only)
router.patch(
    '/:eventId/status',
    protect,
    restrictTo('admin'),
    eventsController.updateEventStatus
);

// Update Event Details (Admin Only)
router.patch(
    '/:eventId',
    protect,
    restrictTo('admin'),
    eventsController.updateEvent
);

// List Events (Search & Pagination support)
router.get(
    '/',
    protect,
    eventsController.listEvents
);

// Get Event by Unique ID (Search/Share Link)
router.get(
    '/unique/:uniqueId',
    protect,
    eventsController.getEventByUniqueId
);

// ==========================================
// ROLE ROUTES
// ==========================================

// Create Role (Admin Only)
router.post(
    '/:eventId/roles',
    protect,
    restrictTo('admin'),
    rolesController.createRole
);

// List Roles (Staff & Admin)
router.get(
    '/:eventId/roles',
    protect,
    rolesController.listRoles
);

// Update Role (Admin Only)
router.patch(
    '/roles/:roleId',
    protect,
    restrictTo('admin'),
    rolesController.updateRole
);

// ==========================================
// PARTICIPANT ROUTES
// ==========================================

// Apply to Event (Staff Only)
router.post(
    '/:eventId/apply',
    protect,
    restrictTo('user'), // Explicitly only users (staff) can apply
    participantsController.applyToEvent
);

// List Participants (Admin Only)
router.get(
    '/:eventId/participants',
    protect,
    restrictTo('admin'),
    participantsController.listParticipants
);

module.exports = router;
