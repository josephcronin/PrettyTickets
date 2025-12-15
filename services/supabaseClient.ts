import { createClient } from '@supabase/supabase-js';

// Your Supabase configuration
// We default to empty strings to prevent using invalid placeholder data
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY || '';

export const isSupabaseConfigured = () => {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
};

if (!isSupabaseConfigured()) {
  console.warn('⚠️ Supabase config missing. App will work in "Demo Mode" (no saving). Add SUPABASE_URL and SUPABASE_KEY to Vercel to enable saving.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);