# Hidden Depths - Digital Sanctuary

![Hidden Depths](public/logo.png)

> "When your head is full, and you need a space to think."

**Hidden Depths** is a modern digital sanctuary designed to provide mental clarity through anonymity and focused listening. It combines immersive WebGL visuals, a calming audio environment, and a secure 1-on-1 booking system to offer a unique mentoring experience.

## 🌟 Core Features

-   **Immersive Atmosphere:** Custom 3D visuals using Voronoi fluid shaders (`CausticOcean`) and ambient audio integration.
-   **Circadian Rhythm System:** Automatically transitions between "Morning Light" (Gold/White) and "Abyssal Night" (Dark/Gold) themes based on the user's local time.
-   **Professional Booking Engine:** 
    -   Smart scheduling (Sundays & Mondays only).
    -   Double-booking protection via Supabase.
    -   Payment integration via **Razorpay** (UPI/Cards).
    -   Automated email confirmations via EmailJS.
-   **PWA Ready:** Installable as a native-like app on iOS and Android with offline support.
-   **Performance Optimized:** Tiered graphics rendering (`Low` vs `High` tiers) to ensure smooth 60fps performance on devices ranging from budget Androids to iPhone 16 Pro.

## 🛠 Tech Stack

-   **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Static Export)
-   **Language:** TypeScript
-   **Styling:** Tailwind CSS v4, Framer Motion
-   **Graphics:** React Three Fiber, OGL (WebGL)
-   **Backend:** Supabase (Database), Cloudflare Pages (Hosting)
-   **Payments:** Razorpay Integration
-   **License:** AGPL-3.0

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
    Create a `.env.local` file with the following keys:
    ```bash
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
    NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_service_id
    NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your_template_id
    NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

## 🛡️ License & Legal

**Copyright © 2026 Himadryy.**

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.
*   You are free to download and inspect the code for educational purposes.
*   **Strict Copyleft:** If you modify this application and distribute it (or host it over a network), you **MUST** open-source your entire project under the same AGPL-3.0 license.
*   **Proprietary Use:** Closed-source usage or commercial rebranding without permission is strictly prohibited.

---
*Built with heart and code in Kolkata.*
