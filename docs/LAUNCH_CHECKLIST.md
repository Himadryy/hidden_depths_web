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

## 6. Go Live! 🚀

Once all checks pass:

1. Remove any "Coming Soon" banners
2. Announce on social media
3. Monitor:
   - Google Analytics for traffic
   - Sentry for errors
   - Razorpay for payments
   - Supabase for DB health

**Support:** hiddendepthsss@gmail.com
