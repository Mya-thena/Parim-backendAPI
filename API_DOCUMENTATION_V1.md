# Parim Pro API Documentation (V1)
**For Frontend Developers**

> **Local Base URL**: `http://localhost:5000/api`
> **Live Base URL**: `https://parim-backendapi-0lfo.onrender.com/api`
> **Auth Header**: `Authorization: Bearer <access_token>`

---

## 📚 Table of Contents
1.  [Authentication](#1-authentication)
2.  [Events Management](#2-events-management)
3.  [Attendance & QR](#3-attendance--qr)
4.  [Training Module](#4-training-module)
5.  [Payments Module](#5-payments-module)
6.  [Reports & Analytics](#6-reports--analytics)
7.  [Bank Details](#7-bank-details)

---

## 1. Authentication
**Route Prefix**: `/api/auth`

### Register (Staff)
`POST /register`
- **Body**: `{ fullName, mail, phoneNumber, createPassword, confirmPassword }`
- **Response**: 201 Created (Requires verification)

### Register (Admin)
`POST /register-admin`
- **Body**: `{ fullName, mail, phoneNumber, createPassword, confirmPassword, role }`
- **Role Enum**: `admin`, `event_manager`

### Verify OTP
`POST /verify-otp`
- **Body**: `{ mail, otp, userType: "user" | "admin" }`

### Login
`POST /login`
- **Body**: `{ mail, password, userType: "user" | "admin" }`
- **Response**: `{ user, tokens: { accessToken, refreshToken } }`

### Resend OTP
`POST /resend-otp`
- **Body**: `{ mail, userType, type }`
- **Params**:
    - `type`: "verification" (default) or "password_reset"

### Forgot Password
`POST /forgot-password`
- **Body**: `{ mail, userType }`

### Reset Password
`POST /reset-password`
- **Body**: `{ mail, otp, newPassword, userType }`

### Get Profile
`GET /profile`
- **Auth**: Required

### Update Profile
`PATCH /profile`
- **Body**: `{ fullName, phoneNumber, profilePicture, address, dateOfBirth }`
- **Note**: `address` and `dateOfBirth` are for Staff only.

### Logout
`POST /logout`
- **Auth**: Required
- **Body**: `{ refreshToken }`

### Refresh Tokens
`POST /refresh-token`
- **Body**: `{ refreshToken }`
- **Response**: `{ accessToken }`


---

## 2. Events Management
**Route Prefix**: `/api/events`

### Create Event (Admin)
`POST /`
- **Body**: `{ title, shortDescription, longDescription, date, location, ... }`

### List Events
`GET /?status=published&page=1`
- **Staff**: Sees Published events only.
- **Admin**: Sees generic list (or own events).

### Get Event Details
`GET /unique/:uniqueId`
- **Public**: Shareable link logic.

### Update Status (Admin)
`PATCH /:eventId/status`
- **Body**: `{ status: "published" | "draft" | "closed" }`

### Safe Delete (Admin)
`DELETE /:eventId`
- **Note**: Fails if active participants exist.

### Add Role (Admin)
`POST /:eventId/roles`
- **Body**: `{ roleName, roleDescription, price, capacity, duration }`
- **Fields**:
  - `roleName` (string, required)
  - `price` (number, required, >= 0)
  - `capacity` (number, required, >= 1)
  - `roleDescription` (string, optional)
  - `duration` (string, optional, e.g. "5hrs")

### Apply for Role (Staff)
`POST /:eventId/apply`
- **Body**: `{ roleId }`

---

## 3. Attendance & QR
**Route Prefix**: `/api/attendance`

### Generate QR (Admin)
`POST /qr/generate`
- **Body**: `{ eventId, expiresInMinutes }`

### Check-In (Staff)
`POST /check-in`
- **Body**: `{ qrToken }`

### Check-Out (Staff)
`POST /check-out`
- **Body**: `{ qrToken }`

### Admin Override
`POST /admin/:attendanceId/override`
- **Body**: `{ action: "CHECK_IN_OVERRIDE", reason }`

---

## 4. Training Module
**Route Prefix**: `/api/training`

### Create Training (Admin)
`POST /`
- **Body**: `{ title, description, youtubeUrl }`

### Assign Training (Admin)
`POST /assign`
- **Body**: `{ eventId, trainingId }`

### Get Assigned Training (Staff/Admin)
`GET /events/:eventId`
- **Response**: List of active training modules.

### Delete Training (Admin)
`DELETE /:trainingId`
- **Effect**: Soft delete (isActive: false).

---

## 5. Payments Module
**Route Prefix**: `/api/payments`

### Calculate Earnings (Admin)
`POST /calculate/:eventId`
- **Effect**: Generates payment records for completed attendance.

### List Event Payments (Admin)
`GET /events/:eventId`
- **Response**: List of payments including **User Bank Details**.

### Approve Payment (Admin)
`PATCH /:paymentId/approve`

### Mark Paid (Admin)
`PATCH /:paymentId/paid`

### My Earnings (Staff)
`GET /my-earnings`

---

## 6. Reports & Analytics
**Route Prefix**: `/api/reports`

### Attendance Summary
`GET /events/:eventId/attendance`

### Export CSV
`GET /events/:eventId/attendance/csv`
- **Content-Type**: `text/csv`

### Export PDF
`GET /events/:eventId/attendance/pdf`
- **Content-Type**: `application/pdf`

---

## 7. Bank Details
**Route Prefix**: `/api/bank`

### Add/Update Bank
`POST /add`
- **Body**: `{ bankName, accountNumber, accountName, bvn }`
- **Logic**: Upsert (Creates if new, Updates if exists).

### Get Bank Details
`GET /`
