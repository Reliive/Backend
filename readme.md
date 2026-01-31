# Reliive Backend

Express.js backend for the Reliive platform with Supabase integration.

## 📁 Project Structure

```
Backend/
├── package.json
├── .env
├── .env.example
└── src/
    ├── server.js          # Entry point
    ├── config/            # Configuration files
    │   ├── supabase.js    # Supabase client
    │   ├── razorpay.js    # Razorpay client
    │   └── firebase.js    # Firebase Admin SDK
    ├── middleware/        # Express middleware
    │   ├── auth.middleware.js
    │   └── validate.middleware.js
    ├── controllers/       # Business logic
    │   ├── auth.controller.js
    │   ├── user.controller.js
    │   ├── club.controller.js
    │   ├── event.controller.js
    │   ├── booking.controller.js
    │   ├── payment.controller.js
    │   ├── partner.controller.js
    │   ├── notification.controller.js
    │   └── admin.controller.js
    ├── routes/           # Route definitions
    │   ├── auth.routes.js
    │   ├── user.routes.js
    │   ├── club.routes.js
    │   ├── event.routes.js
    │   ├── booking.routes.js
    │   ├── payment.routes.js
    │   ├── partner.routes.js
    │   ├── notification.routes.js
    │   └── admin.routes.js
    └── utils/            # Utilities
        ├── response.js
        └── validators.js
```

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

## 📡 API Endpoints

Base URL: `http://localhost:3000/api/v1`

### Auth
- `POST /auth/signup` - Register user
- `POST /auth/login` - Login
- `POST /auth/google` - Google OAuth
- `POST /auth/forgot-password` - Reset password email
- `POST /auth/reset-password` - Reset password
- `POST /auth/refresh` - Refresh token
- `DELETE /auth/logout` - Logout

### Users
- `GET /users/me` - Get profile
- `PATCH /users/me` - Update profile
- `POST /users/me/interests` - Set interests
- `DELETE /users/me` - Delete account
- `GET /users/:id` - Public profile
- `GET /users/:id/badges` - User badges

### Clubs
- `GET /clubs` - List clubs
- `GET /clubs/:id` - Club details
- `POST /clubs/:id/join` - Join club
- `DELETE /clubs/:id/leave` - Leave club
- `GET /clubs/:id/members` - Club members
- `GET /clubs/:id/events` - Club events

### Events
- `GET /events` - List events
- `POST /events` - Create event
- `GET /events/:id` - Event details
- `PATCH /events/:id` - Update event
- `DELETE /events/:id` - Cancel event
- `GET /events/:id/attendees` - Attendees
- `POST /events/:id/rsvp` - RSVP
- `DELETE /events/:id/rsvp` - Cancel RSVP
- `POST /events/:id/checkin` - Check-in
- `GET /events/:id/chat` - Get chat
- `POST /events/:id/chat` - Send message

### Bookings
- `POST /bookings` - Create booking
- `GET /bookings/my` - My bookings
- `GET /bookings/:id` - Booking details
- `POST /bookings/:id/cancel` - Cancel

### Payments
- `POST /payments/create-order` - Create Razorpay order
- `POST /payments/verify` - Verify payment
- `GET /payments/:id` - Payment status
- `POST /payments/refund` - Request refund

### Partners
- `POST /partners/register` - Register
- `GET /partners/me` - Profile
- `PATCH /partners/me` - Update profile
- `GET /partners/events` - Partner events
- `GET /partners/bookings` - Partner bookings
- `GET /partners/analytics` - Analytics
- `GET /partners/payouts` - Payouts
- `POST /partners/payouts/request` - Request payout

### Notifications
- `GET /notifications` - Get notifications
- `PATCH /notifications/:id/read` - Mark read
- `POST /notifications/read-all` - Mark all read
- `GET /notifications/preferences` - Get preferences
- `POST /notifications/preferences` - Update preferences

### Admin
- `GET /admin/reports` - Reports
- `POST /admin/reports/:id/action` - Take action
- `GET /admin/users` - List users
- `POST /admin/users/:id/suspend` - Suspend
- `POST /admin/users/:id/unsuspend` - Unsuspend
- `GET /admin/partners` - List partners
- `POST /admin/partners/:id/verify` - Verify
- `GET /admin/analytics` - Platform analytics

## 🔐 Environment Variables

See `.env.example` for required variables.