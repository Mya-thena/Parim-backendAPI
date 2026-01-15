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

// Delete Event (Admin Only - Safe Delete)
router.delete(
    '/:eventId',
    protect,
    restrictTo('admin'),
    eventsController.deleteEvent
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

// Delete Role (Admin Only - Safe Delete)
router.delete(
    '/roles/:roleId',
    protect,
    restrictTo('admin'),
    rolesController.deleteRole
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

// Change Role (Staff - Pre-Approval Only)
router.patch(
    '/:eventId/participants/change-role',
    protect,
    restrictTo('user'),
    participantsController.changeRole
);

// Withdraw Application (Staff)
router.delete(
    '/:eventId/participants/withdraw',
    protect,
    restrictTo('user'),
    participantsController.withdrawApplication
);

// Approve Participant (Admin Only)
router.patch(
    '/participants/:participantId/approve',
    protect,
    restrictTo('admin'),
    participantsController.approveParticipant
);

// Reject Participant (Admin Only)
router.patch(
    '/participants/:participantId/reject',
    protect,
    restrictTo('admin'),
    participantsController.rejectParticipant
);

module.exports = router;
