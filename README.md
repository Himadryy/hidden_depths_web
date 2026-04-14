# Hidden Depths - Digital Sanctuary

![Hidden Depths](public/logo.png)

> "When your head is full, and you need a space to think."

**Hidden Depths** is a modern digital sanctuary designed to provide mental clarity through anonymity and focused listening. It combines immersive WebGL visuals, a calming audio environment, and a secure 1-on-1 booking system to offer a unique mentoring experience.

## 🌟 Core Features

-   **Immersive Atmosphere:** Custom 3D visuals with Bloom-inspired design and ambient audio integration.
-   **Circadian Rhythm System:** Automatically transitions between "Morning Light" (Gold/White) and "Abyssal Night" (Dark/Gold) themes based on the user's local time.
-   **Professional Booking Engine:** 
    -   Smart scheduling (Sundays & Mondays only).
    -   Double-booking protection via Supabase.
    -   Payment integration via **Razorpay** (UPI/Cards).
    -   Automated email confirmations via EmailJS.
-   **Video Sessions:** Integrated Jitsi video rooms with E2E encryption.
-   **PWA Ready:** Installable as a native-like app on iOS and Android with offline support.
-   **Performance Optimized:** Tiered graphics rendering (`Low` vs `High` tiers) to ensure smooth 60fps performance on devices ranging from budget Androids to iPhone 16 Pro.

## 🛠 Tech Stack

-   **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Static Export)
-   **Language:** TypeScript
-   **Styling:** Tailwind CSS v4, Framer Motion
-   **Graphics:** React Three Fiber, OGL (WebGL)
-   **Backend API:** Go (Chi router) on Render
-   **Database:** Supabase (PostgreSQL + Auth + RLS)
-   **Hosting:** Cloudflare Pages (Frontend), Render (Backend)
-   **Payments:** Razorpay Integration
-   **Monitoring:** Sentry (Error Tracking)
-   **License:** Proprietary (All Rights Reserved)

## 🚀 Getting Started

This project is deployed live at **[hidden-depths-web.pages.dev](https://hidden-depths-web.pages.dev)**.

### Local Development

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Himadryy/hidden_depths_web.git
    cd hidden_depths_web
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables:**
    Create a `.env.local` file (see `.env.example` for all required keys):
    ```bash
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
    NEXT_PUBLIC_API_URL=http://localhost:8081/api
    NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key
    NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_service_id
    NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your_template_id
    NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key
    NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn  # Optional
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

### Backend Development

```bash
cd backend
cp .env.example .env  # Configure your env vars
make run
```

## 🛡️ License & Legal

**Copyright © 2026 Himadryy.**

This project is **proprietary** and distributed as **All Rights Reserved**.
*   Public repository visibility does **not** grant open-source usage rights.
*   You may review code and submit contributions via pull request.
*   You may **not** copy, deploy, resell, rebrand, or run derivative production services without explicit written permission from the owner.
*   See [`LICENSE`](./LICENSE) for full terms.

---
*Built with heart and code in Kolkata.*
