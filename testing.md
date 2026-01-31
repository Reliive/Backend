# Reliive API Testing Guide

## Base URL
```
http://localhost:3000/api/v1
```

## Environment Variables (Postman)
```
{{base_url}} = http://localhost:3000/api/v1
{{access_token}} = (set after login)
{{user_id}} = (set after signup/login)
{{club_id}} = (set after getting clubs)
{{event_id}} = (set after creating event)
{{booking_id}} = (set after creating booking)
{{payment_id}} = (set after creating order)
```

---

## 1. AUTH ENDPOINTS

### 1.1 Signup
```
POST {{base_url}}/auth/signup
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test@123456",
  "name": "Test User"
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": { "id": "uuid", "email": "test@example.com" }
  }
}
```

### 1.2 Login
```
POST {{base_url}}/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test@123456"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "id": "uuid" },
    "session": { "access_token": "...", "refresh_token": "..." }
  }
}
```
**Save:** `access_token` from `data.session.access_token`

### 1.3 Google Auth
```
POST {{base_url}}/auth/google
Content-Type: application/json

{
  "id_token": "google-id-token-from-app"
}
```

### 1.4 Forgot Password
```
POST {{base_url}}/auth/forgot-password
Content-Type: application/json

{
  "email": "test@example.com"
}
```

### 1.5 Refresh Token
```
POST {{base_url}}/auth/refresh
Content-Type: application/json

{
  "refresh_token": "{{refresh_token}}"
}
```

### 1.6 Logout
```
DELETE {{base_url}}/auth/logout
Authorization: Bearer {{access_token}}
```

---

## 2. USER ENDPOINTS

### 2.1 Get My Profile
```
GET {{base_url}}/users/me
Authorization: Bearer {{access_token}}
```

### 2.2 Update My Profile
```
PATCH {{base_url}}/users/me
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "name": "Updated Name",
  "neighborhood": "Koramangala",
  "avatar_url": "https://example.com/avatar.jpg"
}
```

### 2.3 Set Interests
```
POST {{base_url}}/users/me/interests
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "interests": ["Travel", "Photography", "Music", "Hiking", "Cooking"]
}
```

### 2.4 Get Public Profile
```
GET {{base_url}}/users/{{user_id}}
```

### 2.5 Get User Badges
```
GET {{base_url}}/users/{{user_id}}/badges
```

### 2.6 Delete Account
```
DELETE {{base_url}}/users/me
Authorization: Bearer {{access_token}}
```

---

## 3. CLUB ENDPOINTS

### 3.1 List All Clubs
```
GET {{base_url}}/clubs
Authorization: Bearer {{access_token}}  (optional)
```

### 3.2 Get Club Details
```
GET {{base_url}}/clubs/{{club_id}}
```
*Can use UUID or slug (e.g., `travel-explorers`)*

### 3.3 Join Club
```
POST {{base_url}}/clubs/{{club_id}}/join
Authorization: Bearer {{access_token}}
```

### 3.4 Leave Club
```
DELETE {{base_url}}/clubs/{{club_id}}/leave
Authorization: Bearer {{access_token}}
```

### 3.5 Get Club Members
```
GET {{base_url}}/clubs/{{club_id}}/members?limit=20&offset=0
```

### 3.6 Get Club Events
```
GET {{base_url}}/clubs/{{club_id}}/events?upcoming=true&limit=20
```

---

## 4. EVENT ENDPOINTS

### 4.1 List Events
```
GET {{base_url}}/events?upcoming=true&limit=20&offset=0
GET {{base_url}}/events?type=free
GET {{base_url}}/events?type=paid
GET {{base_url}}/events?featured=true
GET {{base_url}}/events?club_id={{club_id}}
```

### 4.2 Create Event
```
POST {{base_url}}/events
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "title": "Morning Walk at Cubbon Park",
  "description": "Join us for a refreshing morning walk",
  "club_id": "{{club_id}}",
  "event_type": "free",
  "starts_at": "2026-02-15T06:00:00Z",
  "ends_at": "2026-02-15T08:00:00Z",
  "location_name": "Cubbon Park",
  "location_address": "Kasturba Road, Bangalore",
  "capacity": 20,
  "tags": ["walking", "health", "nature"]
}
```

### 4.3 Get Event Details
```
GET {{base_url}}/events/{{event_id}}
Authorization: Bearer {{access_token}}  (optional)
```

### 4.4 Update Event
```
PATCH {{base_url}}/events/{{event_id}}
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "title": "Updated Event Title",
  "status": "published"
}
```

### 4.5 Cancel Event
```
DELETE {{base_url}}/events/{{event_id}}
Authorization: Bearer {{access_token}}
```

### 4.6 Get Attendees
```
GET {{base_url}}/events/{{event_id}}/attendees?limit=50
```

### 4.7 RSVP to Event
```
POST {{base_url}}/events/{{event_id}}/rsvp
Authorization: Bearer {{access_token}}
```

### 4.8 Cancel RSVP
```
DELETE {{base_url}}/events/{{event_id}}/rsvp
Authorization: Bearer {{access_token}}
```

### 4.9 Check-in
```
POST {{base_url}}/events/{{event_id}}/checkin
Authorization: Bearer {{access_token}}
```

### 4.10 Get Chat Messages
```
GET {{base_url}}/events/{{event_id}}/chat?limit=50
Authorization: Bearer {{access_token}}
```

### 4.11 Send Chat Message
```
POST {{base_url}}/events/{{event_id}}/chat
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "message": "Hello everyone! Excited for this event!",
  "message_type": "text"
}
```

---

## 5. BOOKING ENDPOINTS (Paid Events)

### 5.1 Create Booking
```
POST {{base_url}}/bookings
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "event_id": "{{event_id}}",
  "payment_id": "{{payment_id}}",
  "ticket_count": 1
}
```

### 5.2 Get My Bookings
```
GET {{base_url}}/bookings/my?limit=20
GET {{base_url}}/bookings/my?status=confirmed
Authorization: Bearer {{access_token}}
```

### 5.3 Get Booking Details
```
GET {{base_url}}/bookings/{{booking_id}}
Authorization: Bearer {{access_token}}
```

### 5.4 Cancel Booking
```
POST {{base_url}}/bookings/{{booking_id}}/cancel
Authorization: Bearer {{access_token}}
```

---

## 6. PAYMENT ENDPOINTS

### 6.1 Create Order (Razorpay)
```
POST {{base_url}}/payments/create-order
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "event_id": "{{event_id}}",
  "ticket_count": 1
}
```

**Response:**
```json
{
  "data": {
    "payment_id": "uuid",
    "razorpay_order_id": "order_xxx",
    "razorpay_key_id": "rzp_test_xxx",
    "amount": 550,
    "breakdown": {
      "tickets": 500,
      "platform_fee": 50
    }
  }
}
```

### 6.2 Verify Payment
```
POST {{base_url}}/payments/verify
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature_xxx"
}
```

### 6.3 Get Payment Status
```
GET {{base_url}}/payments/{{payment_id}}
Authorization: Bearer {{access_token}}
```

### 6.4 Request Refund
```
POST {{base_url}}/payments/refund
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "booking_id": "{{booking_id}}",
  "reason": "Changed my plans"
}
```

---

## 7. PARTNER ENDPOINTS

### 7.1 Register as Partner
```
POST {{base_url}}/partners/register
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "business_name": "Hiking Adventures",
  "business_type": "tours",
  "description": "We organize hiking trips"
}
```

### 7.2 Get Partner Profile
```
GET {{base_url}}/partners/me
Authorization: Bearer {{access_token}}
```

### 7.3 Update Partner Profile
```
PATCH {{base_url}}/partners/me
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "description": "Updated description",
  "bank_details": {
    "account_name": "Hiking Adventures",
    "account_number": "1234567890",
    "ifsc_code": "HDFC0001234",
    "bank_name": "HDFC Bank"
  }
}
```

### 7.4 Get Partner Events
```
GET {{base_url}}/partners/events?limit=20
Authorization: Bearer {{access_token}}
```

### 7.5 Get Partner Bookings
```
GET {{base_url}}/partners/bookings?limit=20
Authorization: Bearer {{access_token}}
```

### 7.6 Get Partner Analytics
```
GET {{base_url}}/partners/analytics
Authorization: Bearer {{access_token}}
```

### 7.7 Get Payouts
```
GET {{base_url}}/partners/payouts
Authorization: Bearer {{access_token}}
```

### 7.8 Request Payout
```
POST {{base_url}}/partners/payouts/request
Authorization: Bearer {{access_token}}
```

---

## 8. NOTIFICATION ENDPOINTS

### 8.1 Get Notifications
```
GET {{base_url}}/notifications?limit=20
GET {{base_url}}/notifications?unread=true
Authorization: Bearer {{access_token}}
```

### 8.2 Mark as Read
```
PATCH {{base_url}}/notifications/{{notification_id}}/read
Authorization: Bearer {{access_token}}
```

### 8.3 Mark All as Read
```
POST {{base_url}}/notifications/read-all
Authorization: Bearer {{access_token}}
```

### 8.4 Get Preferences
```
GET {{base_url}}/notifications/preferences
Authorization: Bearer {{access_token}}
```

### 8.5 Update Preferences
```
POST {{base_url}}/notifications/preferences
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "push_enabled": true,
  "email_enabled": true,
  "whatsapp_enabled": false,
  "reminder_48h": true,
  "reminder_2h": true
}
```

---

## 9. ADMIN ENDPOINTS
*Requires admin role*

### 9.1 Get Reports
```
GET {{base_url}}/admin/reports?status=pending&limit=20
Authorization: Bearer {{admin_token}}
```

### 9.2 Take Action on Report
```
POST {{base_url}}/admin/reports/{{report_id}}/action
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "action": "resolve",
  "notes": "Issue resolved"
}
```
*Actions: `resolve`, `dismiss`, `warn`, `suspend`*

### 9.3 List Users
```
GET {{base_url}}/admin/users?limit=20
GET {{base_url}}/admin/users?role=host
GET {{base_url}}/admin/users?search=john
Authorization: Bearer {{admin_token}}
```

### 9.4 Suspend User
```
POST {{base_url}}/admin/users/{{user_id}}/suspend
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "duration_hours": 720,
  "reason": "Violation of guidelines"
}
```

### 9.5 Unsuspend User
```
POST {{base_url}}/admin/users/{{user_id}}/unsuspend
Authorization: Bearer {{admin_token}}
```

### 9.6 List Partners
```
GET {{base_url}}/admin/partners?verified=false
Authorization: Bearer {{admin_token}}
```

### 9.7 Verify Partner
```
POST {{base_url}}/admin/partners/{{partner_id}}/verify
Authorization: Bearer {{admin_token}}
```

### 9.8 Platform Analytics
```
GET {{base_url}}/admin/analytics
Authorization: Bearer {{admin_token}}
```

---

## Testing Flow

### Basic Flow:
1. **Signup** → Save access_token
2. **Get Clubs** → Save a club_id
3. **Join Club** → Join the club
4. **Create Event** → Save event_id
5. **Update Event** → Set status to "published"
6. **RSVP** → RSVP to event
7. **Check-in** → Check in at event time

### Paid Event Flow:
1. **Create Order** → Get razorpay_order_id
2. **Complete Razorpay Payment** (in app)
3. **Verify Payment** → Save payment_id
4. **Create Booking** → Confirm booking

---

## Response Format

All endpoints return:
```json
{
  "success": true|false,
  "message": "Optional message",
  "data": { ... }
}
```

Paginated responses include:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

## Error Codes
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error
