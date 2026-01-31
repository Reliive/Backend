# Supabase Database Setup Guide

This guide shows you how to set up the Reliive database in Supabase.

---

## Method 1: SQL Editor (Recommended ⭐)

### Step 1: Open Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project: **frhtobtutcjnbbgdjrhu**

### Step 2: Open SQL Editor
1. Click **SQL Editor** in the left sidebar
2. Click **+ New query**

### Step 3: Run the Schema
1. Open the file: `database/schema.sql`
2. Copy ALL the content
3. Paste it into the SQL Editor
4. Click **Run** (or press Ctrl+Enter)

### Step 4: Verify
After running, you should see:
- ✅ 16 tables created
- ✅ 7 badges seeded
- ✅ 10 clubs seeded
- ✅ RLS policies enabled

---

## Method 2: Table Editor (Manual)

If you prefer creating tables manually:

### Step 1: Go to Table Editor
1. Click **Table Editor** in the left sidebar
2. Click **Create a new table**

### Step 2: Create Tables

#### Create `users` table:
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key, FK to auth.users |
| email | varchar(255) | Unique, not null |
| name | varchar(255) | |
| avatar_url | text | |
| phone | varchar(20) | |
| neighborhood | varchar(255) | |
| role | varchar(50) | Default: 'user' |
| is_verified | boolean | Default: false |
| onboarding_completed | boolean | Default: false |
| accessibility_prefs | jsonb | Default: {} |
| emergency_contact | jsonb | |
| fcm_token | text | |
| created_at | timestamptz | Default: now() |
| updated_at | timestamptz | Default: now() |

#### Create `clubs` table:
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key, auto-generate |
| name | varchar(255) | Not null |
| slug | varchar(255) | Unique, not null |
| description | text | |
| icon | text | |
| cover_image | text | |
| color | varchar(7) | |
| member_count | integer | Default: 0 |
| is_active | boolean | Default: true |
| created_at | timestamptz | Default: now() |
| updated_at | timestamptz | Default: now() |

*Repeat for other tables...*

---

## Tables Overview

| # | Table | Purpose |
|---|-------|---------|
| 1 | users | User profiles |
| 2 | user_interests | User interests (travel, music, etc) |
| 3 | badges | Available badges |
| 4 | user_badges | Earned badges |
| 5 | clubs | Interest-based clubs |
| 6 | user_clubs | Club memberships |
| 7 | events | Events (free & paid) |
| 8 | rsvps | Event RSVPs |
| 9 | event_chats | In-event chat messages |
| 10 | partners | Partner business profiles |
| 11 | payments | Razorpay payment records |
| 12 | bookings | Paid event bookings |
| 13 | payouts | Partner payout requests |
| 14 | notifications | User notifications |
| 15 | notification_preferences | Notification settings |
| 16 | reports | User/event reports |

---

## Verify Tables Created

After running the schema, check in Table Editor:

```
users ✓
user_interests ✓
badges ✓ (7 rows)
user_badges ✓
clubs ✓ (10 rows)
user_clubs ✓
events ✓
rsvps ✓
event_chats ✓
partners ✓
payments ✓
bookings ✓
payouts ✓
notifications ✓
notification_preferences ✓
reports ✓
```

---

## Enable RLS (Row Level Security)

If not already enabled:

1. Go to **Authentication** → **Policies**
2. For each table, click **Enable RLS**

Or run in SQL Editor:
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- (already included in schema.sql)
```

---

## Get Your API Keys

1. Go to **Project Settings** → **API**
2. Copy:
   - **Project URL**: `https://frhtobtutcjnbbgdjrhu.supabase.co`
   - **anon public key**: For frontend
   - **service_role key**: For backend (keep secret!)

---

## Test Connection

After setup, test with `npm run dev` and try:
```
GET http://localhost:3000/api/v1/clubs
```

Should return the 10 seeded clubs!
