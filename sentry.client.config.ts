import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Adjust this value in production
  tracesSampleRate: 0.1,
  
  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',
  
  // Only send errors in production
  enabled: process.env.NODE_ENV === 'production',
  
  // Capture unhandled promise rejections
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
  // Session Replay (only capture on errors)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.1,
});
