# Hidden Depths - Product Requirements Document (PRD)

## Overview
**Hidden Depths** is a modern digital sanctuary designed to provide mental clarity through anonymity and focused listening. It combines immersive WebGL visuals, a calming audio environment, and a secure 1-on-1 booking system to offer a unique mentoring experience.

**Tagline:** "When your head is full, and you need a space to think."

---

## Core Features

### 1. Immersive Atmosphere
- Custom 3D visuals using Voronoi fluid shaders (CausticOcean)
- Ambient audio integration for a calming experience
- Full-screen immersive environment

### 2. Circadian Rhythm System
- Automatic theme transitions based on user's local time
- **Morning Light:** Gold/White theme (daytime)
- **Abyssal Night:** Dark/Gold theme (nighttime)

### 3. Professional Booking Engine
- Smart scheduling (Sundays & Mondays only)
- Double-booking protection via Supabase database
- Payment integration via **Razorpay** (UPI/Cards support)
- Automated email confirmations via EmailJS
- Admin panel for managing bookings

### 4. PWA Ready
- Installable as native-like app on iOS and Android
- Offline support capabilities

### 5. Performance Optimization
- Tiered graphics rendering (Low vs High tiers)
- Ensures 60fps performance across device range (budget Androids to iPhone 16 Pro)

---

## Tech Stack

### Frontend
- **Framework:** Next.js 16 (App Router, Static Export)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4, Framer Motion
- **Graphics:** React Three Fiber, OGL (WebGL)

### Backend
- **Language:** Go
- **Database:** PostgreSQL (via Supabase)
- **Authentication:** JWT Bearer Tokens (Supabase Auth)
- **Hosting:** Cloudflare Pages

### Payments & Communication
- **Payments:** Razorpay Integration
- **Email:** EmailJS

---

## User Flows

### 1. Landing Experience
1. User arrives at immersive landing page
2. Auto-detects time of day and applies appropriate theme
3. Displays calming 3D visuals (CausticOcean shader)
4. Optional ambient audio playback

### 2. Booking Flow
1. User clicks "Book a Session"
2. Calendar displays available slots (Sundays & Mondays only)
3. User selects date and time
4. Enters contact information (name, email, phone)
5. Payment via Razorpay (UPI/Cards)
6. Booking confirmation email sent via EmailJS
7. Booking stored in Supabase with payment reference

### 3. Admin Flow
1. Admin authentication via JWT
2. View all bookings dashboard
3. Manage booking statuses
4. Add meeting links to confirmed bookings
5. View insights and analytics

---

## API Endpoints

### Authentication
- Protected by JWT Bearer tokens
- Header: `Authorization: Bearer <token>`

### Booking API
- `POST /api/bookings` - Create new booking
- `GET /api/bookings/available` - Get available slots
- `GET /api/bookings` - List all bookings (admin)
- `PUT /api/bookings/:id` - Update booking (admin)

### Admin API
- `GET /api/admin/bookings` - Get all bookings with filters
- `GET /api/admin/insights` - Get analytics data
- `POST /api/admin/meeting-link` - Add meeting link to booking

### Marketing API
- `POST /api/marketing/subscribe` - Newsletter subscription

---

## Database Schema

### bookings
- id (UUID)
- user_name (string)
- user_email (string)
- user_phone (string)
- booking_date (date)
- booking_time (time)
- status (enum: pending, confirmed, cancelled, completed)
- razorpay_payment_id (string)
- razorpay_order_id (string)
- meeting_link (string, nullable)
- created_at (timestamp)
- updated_at (timestamp)

### audit_logs
- id (UUID)
- action (string)
- entity_type (string)
- entity_id (UUID)
- performed_by (string)
- details (JSON)
- created_at (timestamp)

### marketing_contacts
- id (UUID)
- email (string, unique)
- subscribed_at (timestamp)

---

## Security Requirements

1. **Authentication:** JWT Bearer tokens for all protected routes
2. **Admin Access:** Email-based admin whitelist
3. **Payment Security:** Razorpay test/live key separation
4. **CORS:** Restricted to allowed origins
5. **Input Validation:** All user inputs sanitized
6. **Rate Limiting:** Booking creation rate-limited

---

## Business Rules

1. **Booking Availability:** Only Sundays and Mondays
2. **No Double Booking:** Time slot locking via database
3. **Payment Required:** All bookings require successful payment
4. **Email Confirmation:** Automated on successful booking
5. **Meeting Links:** Added by admin after booking confirmation

---

## Success Metrics

- Booking conversion rate
- Payment success rate
- User retention (return visitors)
- Page load performance (< 3s)
- 60fps on target devices

---

## Future Enhancements

- Recurring booking support
- Calendar sync (Google/Outlook)
- SMS notifications
- Video call integration
- User reviews and ratings

---

**License:** AGPL-3.0  
**Copyright:** © 2026 Himadryy
