// User Roles
const USER_ROLES = {
  STAFF: 'staff',
  SUPERVISOR: 'supervisor',
  ADMIN: 'admin'
};

// Event Statuses
const EVENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Attendance Statuses (Sprint 3 - State Machine)
const ATTENDANCE_STATUS = {
  ASSIGNED: 'ASSIGNED',
  CHECKED_IN: 'CHECKED_IN',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  ABSENT: 'ABSENT'
};

// Payment Statuses
const PAYMENT_STATUS = {
  CALCULATED: 'calculated',
  PENDING: 'pending',
  APPROVED: 'approved',
  PAID: 'paid',
  REJECTED: 'rejected'
};

// Training Statuses
const TRAINING_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed'
};

// API Response Messages
const RESPONSE_MESSAGES = {
  // Success messages
  ACCOUNT_CREATED: 'Account created successfully',
  ACCOUNT_VERIFIED: 'Account verified successfully',
  LOGIN_SUCCESS: 'Login successful',
  BANK_DETAILS_ADDED: 'Bank details added successfully',
  OTP_SENT: 'OTP sent successfully',

  // Error messages
  ALL_FIELDS_REQUIRED: 'All fields are required',
  PASSWORDS_NOT_MATCH: 'Passwords do not match',
  EMAIL_EXISTS: 'Email already exists',
  INVALID_CREDENTIALS: 'Invalid credentials',
  ACCOUNT_NOT_VERIFIED: 'Please verify your account first',
  USER_NOT_FOUND: 'User not found',
  INVALID_OTP: 'Invalid OTP',
  OTP_EXPIRED: 'OTP has expired',
  ACCOUNT_ALREADY_VERIFIED: 'Account already verified',
  BANK_DETAILS_EXIST: 'Bank details already exist for this user',
  BANK_DETAILS_NOT_FOUND: 'Bank details not found',
  INVALID_ACCOUNT_NUMBER: 'Account number must be exactly 10 digits',
  INVALID_BVN: 'BVN must be exactly 11 digits',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  INTERNAL_SERVER_ERROR: 'Internal server error'
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
};

// QR Token Types
const QR_TOKEN_TYPE = {
  EVENT_QR: 'EVENT_QR'
};

// Attendance Methods
const ATTENDANCE_METHOD = {
  QR: 'qr',
  MANUAL: 'manual',
  OVERRIDE: 'override'
};

// Override Actions
const OVERRIDE_ACTION = {
  CHECK_IN_OVERRIDE: 'CHECK_IN_OVERRIDE',
  CHECK_OUT_OVERRIDE: 'CHECK_OUT_OVERRIDE',
  MARK_ABSENT: 'MARK_ABSENT',
  STATUS_CHANGE: 'STATUS_CHANGE'
};

module.exports = {
  USER_ROLES,
  EVENT_STATUS,
  ATTENDANCE_STATUS,
  PAYMENT_STATUS,
  TRAINING_STATUS,
  RESPONSE_MESSAGES,
  HTTP_STATUS,
  QR_TOKEN_TYPE,
  ATTENDANCE_METHOD,
  OVERRIDE_ACTION
};
