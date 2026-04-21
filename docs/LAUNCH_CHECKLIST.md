# Production Launch Checklist

Complete these steps to go live with Hidden Depths.

---

## 1. Google Analytics 4 Setup

### Get Your GA4 Measurement ID

1. Go to [Google Analytics](https://analytics.google.com/)
2. Click **Admin** (gear icon) → **Create Property**
3. Enter:
   - Property name: `Hidden Depths`
   - Timezone: `India (GMT+5:30)`
   - Currency: `Indian Rupee (INR)`
4. Click **Create** → **Web** platform
5. Enter URL: `https://hidden-depths-web.pages.dev`
6. Copy the **Measurement ID** (format: `G-XXXXXXXXXX`)

### Add to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select **Pages** → **hidden-depths-web**
3. Go to **Settings** → **Environment variables**
4. Add variable:
   ```
   NEXT_PUBLIC_GA_ID = G-XXXXXXXXXX
   ```
5. Click **Save** → **Redeploy** the site

### Verify

After redeployment, check page source for:
```html
<script src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
```

---

## 2. Razorpay Live Mode

### Switch from Test to Live Keys

1. Log into [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Toggle from **Test Mode** to **Live Mode** (top-right switch)
3. Go to **Settings** → **API Keys**
4. Generate new live keys (or use existing)
5. Copy:
   - `Key ID`: `rzp_live_xxxxxxxxxxxx`
   - `Key Secret`: `xxxxxxxxxxxxxxxxxxxxxxxx`

### Update Backend Environment (Render)

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Select **hidden-depths-web** backend service
3. Go to **Environment** tab
4. Update:
   ```
   RAZORPAY_KEY_ID = rzp_live_xxxxxxxxxxxx
   RAZORPAY_KEY_SECRET = xxxxxxxxxxxxxxxxxxxxxxxx
   ```
5. Click **Save Changes** (auto-redeploys)

### Update Frontend Environment (Cloudflare)

1. Go to Cloudflare Pages → **hidden-depths-web**
2. **Settings** → **Environment variables**
3. Update:
   ```
   NEXT_PUBLIC_RAZORPAY_KEY_ID = rzp_live_xxxxxxxxxxxx
   ```
4. Redeploy

### Configure Webhook

1. In Razorpay Dashboard → **Settings** → **Webhooks**
2. Click **Add New Webhook**
3. Enter:
   - URL: `https://hidden-depths-web.onrender.com/api/webhook/razorpay`
   - Events: `payment.captured`, `payment.failed`
   - Secret: (copy from Render env `RAZORPAY_WEBHOOK_SECRET`)
4. Click **Create Webhook**

### Test Live Payment

1. Make a small real payment (₹1 if possible, or book cheapest session)
2. Verify booking appears in admin dashboard
3. Check Razorpay dashboard for transaction

---

## 3. Sentry Error Tracking (Optional)

Already integrated! To enable:

1. Go to [Sentry.io](https://sentry.io/) → Create project (Next.js)
2. Copy DSN URL
3. Add to Cloudflare Pages env:
   ```
   NEXT_PUBLIC_SENTRY_DSN = https://xxx@xxx.ingest.sentry.io/xxx
   ```

---

## 4. EmailJS Contact Form

Already configured! Verify it works:

1. Go to [EmailJS Dashboard](https://dashboard.emailjs.com/)
2. Check **Email Templates** has a contact template
3. Verify Cloudflare env has:
   ```
   NEXT_PUBLIC_EMAILJS_SERVICE_ID = service_xxx
   NEXT_PUBLIC_EMAILJS_TEMPLATE_ID = template_xxx
   NEXT_PUBLIC_EMAILJS_PUBLIC_KEY = xxx
   ```

---

## 5. Pre-Launch Checklist

### Environment Variables

| Platform | Variable | Status |
|----------|----------|--------|
| Cloudflare | `NEXT_PUBLIC_SUPABASE_URL` | ✅ Set |
| Cloudflare | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Set |
| Cloudflare | `NEXT_PUBLIC_API_URL` | ✅ Set |
| Cloudflare | `NEXT_PUBLIC_RAZORPAY_KEY_ID` | ⏳ Update to live |
| Cloudflare | `NEXT_PUBLIC_GA_ID` | ⏳ Add |
| Cloudflare | `NEXT_PUBLIC_SENTRY_DSN` | Optional |
| Render | `RAZORPAY_KEY_ID` | ⏳ Update to live |
| Render | `RAZORPAY_KEY_SECRET` | ⏳ Update to live |

### Functional Tests

- [ ] Homepage loads correctly
- [ ] Booking flow completes with live payment
- [ ] Contact form sends email
- [ ] Video session room loads (Jitsi)
- [ ] Admin dashboard accessible
- [ ] PWA install prompt works (Chrome mobile)
- [ ] 404 page shows for invalid URLs

### SEO Verification

- [ ] Google Search Console verified
- [ ] Bing Webmaster Tools submitted
- [ ] Sitemap fetched successfully
- [ ] robots.txt accessible
- [ ] JSON-LD schemas valid ([validator](https://validator.schema.org/))

---

## 6. Booking Hardening Rollout + Rollback Runbook

Use this for the booking lifecycle hardening release (`000011_booking_lifecycle_hardening` + updated booking handlers).

### Pre-deploy Checklist (Booking-specific)

- [ ] Confirm backend env vars are present and correct: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
- [ ] Confirm deploy has authentication available for protected booking endpoints (`/api/v1/bookings`, `/api/v1/bookings/{id}/release-pending`, `/api/v1/bookings/{id}`).
- [ ] Confirm migration access is available and no prior migration is left in a failed/dirty state.
- [ ] Take/verify a production DB backup or snapshot before rollout.
- [ ] Confirm on-call owner is watching logs/metrics during rollout window.

### Migration Ordering (Critical)

1. Apply DB migrations through `000011_booking_lifecycle_hardening` **before** deploying the new backend app build.
2. Do not skip migration order; `000011` depends on prior booking schema/index history.
3. Verify schema before app rollout:
   - `bookings` has: `status_reason`, `confirmed_at`, `failed_at`, `cancelled_at`, `released_at`, `released_by`
   - `processed_webhooks` table exists
   - `bookings_payment_status_check` allows `cancelled`
4. Deploy backend app after schema verification completes.

### Post-deploy Smoke Tests

1. **Create booking (pending flow)**  
   Create a paid booking via `POST /api/v1/bookings`; confirm response includes `booking_id` + `order_id` and booking status is `pending`.
2. **Verify payment**  
   Call `POST /api/v1/bookings/verify`; confirm booking transitions to `paid` and remains visible in user booking APIs.
3. **Webhook duplicate handling**  
   Replay the same Razorpay webhook event to `POST /api/v1/webhook/razorpay`; expect HTTP 200 without duplicate booking transitions.
4. **Release pending behavior**  
   For an unpaid pending booking, call `POST /api/v1/bookings/{id}/release-pending`; confirm slot is freed and booking is no longer `pending`.
5. **Cancel confirmed behavior**  
   For a paid booking, call `DELETE /api/v1/bookings/{id}` with header `X-Booking-Cancel: confirmed`; confirm status becomes `cancelled` and slot is freed.

### Monitoring Checks (First 30-60 minutes)

- Health endpoints remain green:
  - `GET /api/health`
  - `GET /api/health/ready` (database should report `ok`)
- Booking/payment metrics on `/api/metrics`:
  - `booking_operations_total{operation="webhook",result="processing_error"}` should stay low
  - `booking_operations_total{operation="webhook",result="duplicate_event"}` increments only when duplicates are replayed
  - `payment_operations_total{status="signature_invalid"}` should not spike
- Logs: watch for repeated webhook signature failures and DB update errors in booking transitions.
- Pending-hold cleanup behavior: track long-lived pending rows (older than 5 minutes) and investigate if count trends upward instead of returning toward zero.

### Rollback Steps (Safe Order + Cautions)

1. **Rollback app first** to the previous backend release if booking errors spike.
2. Keep migration `000011` in place during initial app rollback (schema is safer to keep than to immediately remove).
3. **Migration rollback is high risk** and should be used only with explicit approval:
   - Down migration removes `processed_webhooks` and lifecycle timestamps/reason fields.
   - Down migration also removes `cancelled` from allowed `payment_status`, which can conflict with live data.
4. Before any migration rollback decision, review production data for:
   - existing `cancelled` bookings
   - webhook idempotency records needed for audit/replay safety
5. After rollback (app-only or app+DB), repeat core smoke tests: create booking, payment verify, webhook processing, and cancellation flow.

---

## 7. Go Live! 🚀

Once all checks pass:

1. Remove any "Coming Soon" banners
2. Announce on social media
3. Monitor:
   - Google Analytics for traffic
   - Sentry for errors
   - Razorpay for payments
   - Supabase for DB health

**Support:** hiddendepthsss@gmail.com
