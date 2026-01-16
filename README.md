# Hidden Depths - A Space to Think

**Hidden Depths** is a digital sanctuary designed for clarity and guided thinking. It offers a unique, confidential environment for individuals who need a focused space to process their thoughts away from the distractions of traditional video calls.

![Project Preview](/public/logo.png)

## ✨ Features

- **Focused Anonymity:** A design philosophy centered on user comfort and guided reflection.
- **Interactive Media Carousel:** A smooth, 3D card-stack experience for navigating core concepts.
- **Prismatic Background:** High-performance WebGL animations (OGL) providing a meditative visual anchor.
- **Custom Booking System:** Integrated calendar and scheduling system with direct email notifications via EmailJS.
- **Modern UI/UX:** Built with Tailwind CSS and Framer Motion for a premium, responsive feel.
- **Performance Optimized:** Leveraging Next.js 16 features like optimized images and metadata.

## 🛠️ Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/) & [OGL](https://github.com/o-g-l/ogl) (WebGL)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Email Service:** [EmailJS](https://www.emailjs.com/)

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/Himadryy/hidden_depths_web.git
cd hidden_depths_web
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory and add your EmailJS credentials:
```env
NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_service_id
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your_template_id
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key
```

### 4. Run the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see the result.

## 📦 Deployment

This project is optimized for deployment on the [Vercel Platform](https://vercel.com/new).

1. Push your code to GitHub.
2. Connect your repository to Vercel.
3. Add the Environment Variables from your `.env.local` to the Vercel project settings.
4. Deploy!

---

&copy; 2025 Hidden Depths. All Rights Reserved.