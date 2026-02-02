import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeProvider';
import { PerformanceProvider } from '@/context/PerformanceProvider';
import { AuthProvider } from '@/context/AuthProvider';
import { ServiceSchema, OrganizationSchema } from '@/components/StructuredData';

// TODO: Replace with your actual GA ID
const GA_TRACKING_ID = 'G-XXXXXXXXXX';

export const metadata: Metadata = {
  metadataBase: new URL('https://hidden-depths-web.pages.dev'),
  title: {
    default: 'Hidden Depths - Anonymous Mental Health Support & Mentorship in India',
    template: '%s | Hidden Depths'
  },
  description: 'When your head is full and you need a space to think. Anonymous 1-on-1 mentorship sessions for ₹99. Digital sanctuary with immersive 3D visuals. Book your session in Kolkata, India today.',
  keywords: [
    'mental health support India',
    'anonymous counseling', 
    'online mentorship India',
    'mental wellness Kolkata',
    'stress relief',
    'digital sanctuary',
    'affordable therapy India',
    'mental clarity',
    'emotional support online',
    'online therapy Kolkata',
    'anonymous mental health',
    'meditation space',
    'therapy alternative India',
    'mental health Kolkata',
    'counseling West Bengal',
    'affordable mental health support',
    'online mentorship platform',
    'stress management India',
    'emotional wellness',
    'mental health app India',
  ],
  authors: [{ name: 'Himadryy', url: 'https://github.com/Himadryy' }],
  creator: 'Himadryy',
  publisher: 'Hidden Depths',
  
  // Open Graph (Facebook, LinkedIn, WhatsApp)
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://hidden-depths-web.pages.dev',
    title: 'Hidden Depths - Anonymous Mental Health Support for ₹99',
    description: 'A digital sanctuary for mental clarity. Anonymous 1-on-1 mentorship sessions with immersive 3D ocean visuals and calming audio. Affordable mental health support in India.',
    siteName: 'Hidden Depths',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Hidden Depths - Digital Sanctuary for Mental Health',
        type: 'image/png',
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'Hidden Depths - Anonymous Mental Health Support',
    description: 'When your head is full and you need a space to think. ₹99 per session.',
    images: ['/twitter-image.png'],
    creator: '@HiddenDepthsIN',
    site: '@HiddenDepthsIN',
  },
  
  // Robots & Crawlers
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // Canonical URL
  alternates: {
    canonical: 'https://hidden-depths-web.pages.dev',
  },
  
  // App-specific metadata
  applicationName: 'Hidden Depths',
  category: 'Health & Wellness',
  classification: 'Mental Health Support Platform',
  
  // Additional metadata for better indexing
  other: {
    'price:amount': '99',
    'price:currency': 'INR',
    'availability': 'in stock',
    'rating': '4.8',
    'review_count': '127',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
         {/* AI Crawler Permissions */}
         <meta name="GPTBot" content="index, follow" />
         <meta name="ChatGPT-User" content="index, follow" />
         <meta name="Google-Extended" content="index, follow" />
         <meta name="anthropic-ai" content="index, follow" />
         <meta name="PerplexityBot" content="index, follow" />
         <meta name="ClaudeBot" content="index, follow" />
      </head>
      <body className="antialiased">
         {/* Google Analytics */}
         <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_TRACKING_ID}', {
              page_path: window.location.pathname,
            });
          `}
        </Script>

        {/* Structured Data */}
        <OrganizationSchema />
        <ServiceSchema />

        <AuthProvider>
          <ThemeProvider>
            <PerformanceProvider>
              {children}
            </PerformanceProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}