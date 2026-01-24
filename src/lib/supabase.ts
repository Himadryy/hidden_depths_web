import { createClient } from '@supabase/supabase-js';

// These environment variables will need to be added to your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // We don't throw an error here to prevent the app from crashing during build time
  // or if the features aren't being used yet.
  console.warn('Supabase keys are missing. Real-time booking features will not work.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);
