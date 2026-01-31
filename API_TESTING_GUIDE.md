# Reliive API Testing Guide - Step by Step

## Prerequisites
```bash
# Terminal 1: Start the server
cd /home/iso/Documents/Project/moral/Backend
npm run dev

# Server should show: 🚀 Reliive Backend running on port 3000
```

**Base URL:** `http://localhost:3000/api/v1`

---

## Step 1: Health Check ✅

```
GET http://localhost:3000/health
```

**Expected:**
```json
{ "status": "ok", "timestamp": "2026-01-31T..." }
```

---

## Step 2: Get Clubs (No Auth Required)

```
GET http://localhost:3000/api/v1/clubs
```

**Expected:** List of 10 clubs (Travel Explorers, Photography Club, etc.)

---

## Step 3: Signup

```
POST http://localhost:3000/api/v1/auth/signup
Content-Type: application/json

{
  "email": "testuser@reliive.com",
  "password": "Test@123456",
  "name": "Test User"
}
```

**Expected (201):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": { "user": { "id": "uuid-here", "email": "testuser@reliive.com" } }
}
```

📝 **Save the `user.id` for later tests**

---

## Step 4: Login

```
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "testuser@reliive.com",
  "password": "Test@123456"
}
```

**Expected (200):**
```json
{
  "success": true,
  "data": {
    "user": { "id": "..." },
    "session": {
      "access_token": "eyJhbGc...",
      "refresh_token": "..."
    }
  }
}
```

📝 **Save `access_token` - use it for all authenticated requests!**

---

## Step 5: Get My Profile

```
GET http://localhost:3000/api/v1/users/me
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Expected:** Your user profile with empty interests/clubs

---

## Step 6: Set Interests

```
POST http://localhost:3000/api/v1/users/me/interests
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "interests": ["Travel", "Photography", "Music", "Hiking", "Food"]
}
```

**Expected:** Interests saved, onboarding marked complete

---

## Step 7: Join a Club

First get a club_id from Step 2, then:

```
POST http://localhost:3000/api/v1/clubs/{club_id}/join
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Or use slug:
```
POST http://localhost:3000/api/v1/clubs/travel-explorers/join
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Expected (201):**
```json
{ "success": true, "message": "Joined club", "data": { "club_id": "..." } }
```

---

## Step 8: Create an Event

```
POST http://localhost:3000/api/v1/events
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "title": "Morning Walk at Cubbon Park",
  "description": "Join us for a refreshing morning walk in nature",
  "club_id": "YOUR_CLUB_ID",
  "event_type": "free",
  "starts_at": "2026-02-15T06:00:00Z",
  "ends_at": "2026-02-15T08:00:00Z",
  "location_name": "Cubbon Park Main Gate",
  "location_address": "Kasturba Road, Bangalore",
  "capacity": 20,
  "tags": ["walking", "health", "nature"]
}
```

**Expected (201):** Event created with status "draft"

📝 **Save the `event_id`**

---

## Step 9: Publish the Event

```
PATCH http://localhost:3000/api/v1/events/{event_id}
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "status": "published"
}
```

**Expected:** Event status changed to "published"

---

## Step 10: List Events

```
GET http://localhost:3000/api/v1/events?upcoming=true
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Expected:** Your event appears in the list

---

## Step 11: RSVP to Event (Different User)

Create a second user, login, then RSVP:

```
POST http://localhost:3000/api/v1/events/{event_id}/rsvp
Authorization: Bearer SECOND_USER_TOKEN
```

**Expected (201):**
```json
{ "success": true, "message": "RSVP confirmed!", "data": { "status": "confirmed" } }
```

---

## Step 12: Get Event Attendees

```
GET http://localhost:3000/api/v1/events/{event_id}/attendees
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Expected:** List of users who RSVP'd

---

## Step 13: Event Chat

### Send a message:
```
POST http://localhost:3000/api/v1/events/{event_id}/chat
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "message": "Hello everyone! Excited for this event!",
  "message_type": "text"
}
```

### Get messages:
```
GET http://localhost:3000/api/v1/events/{event_id}/chat
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

## Step 14: Get Notifications

```
GET http://localhost:3000/api/v1/notifications
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

## Step 15: Update Notification Preferences

```
POST http://localhost:3000/api/v1/notifications/preferences
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "push_enabled": true,
  "email_enabled": true,
  "whatsapp_enabled": false
}
```

---

## Step 16: Register as Partner

```
POST http://localhost:3000/api/v1/partners/register
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "business_name": "Adventure Tours",
  "business_type": "tours",
  "description": "We organize adventure trips"
}
```

---

## Step 17: Get Partner Analytics

```
GET http://localhost:3000/api/v1/partners/analytics
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

## Testing Paid Events Flow

### Step A: Create Paid Event
```
POST http://localhost:3000/api/v1/events
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "title": "Photography Workshop",
  "club_id": "YOUR_CLUB_ID",
  "event_type": "paid",
  "price": 500,
  "starts_at": "2026-02-20T10:00:00Z",
  "capacity": 15
}
```

### Step B: Create Payment Order
```
POST http://localhost:3000/api/v1/payments/create-order
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "event_id": "PAID_EVENT_ID",
  "ticket_count": 1
}
```

**Response includes `razorpay_order_id` for checkout**

### Step C: Verify Payment (after Razorpay checkout)
```
POST http://localhost:3000/api/v1/payments/verify
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature_xxx"
}
```

### Step D: Create Booking
```
POST http://localhost:3000/api/v1/bookings
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "event_id": "PAID_EVENT_ID",
  "payment_id": "PAYMENT_ID"
}
```

---

## Admin Endpoints (Requires Admin Role)

First, manually set a user's role to 'admin' in Supabase:
```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@reliive.com';
```

Then test:
```
GET http://localhost:3000/api/v1/admin/analytics
Authorization: Bearer ADMIN_TOKEN

GET http://localhost:3000/api/v1/admin/users
Authorization: Bearer ADMIN_TOKEN

GET http://localhost:3000/api/v1/admin/partners?verified=false
Authorization: Bearer ADMIN_TOKEN
```

---

## Quick Test Commands (cURL)

```bash
# Health check
curl http://localhost:3000/health

# Get clubs
curl http://localhost:3000/api/v1/clubs

# Signup
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test@123456","name":"Test"}'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test@123456"}'

# Get profile (replace TOKEN)
curl http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Expected API Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (no/invalid token) |
| 403 | Forbidden (wrong role) |
| 404 | Not Found |
| 500 | Server Error |

---

## Checklist

- [ ] Health check works
- [ ] Get clubs works
- [ ] Signup works
- [ ] Login works (save token!)
- [ ] Get profile works
- [ ] Set interests works
- [ ] Join club works
- [ ] Create event works
- [ ] Publish event works
- [ ] RSVP works
- [ ] Event chat works
- [ ] Notifications work
- [ ] Partner registration works
- [ ] (Optional) Paid event flow works
- [ ] (Optional) Admin endpoints work
