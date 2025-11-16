import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

// Diagnostics (temporary): ensure values are present
console.log('VITE_SUPABASE_URL value:', supabaseUrl);
console.log('VITE_SUPABASE_ANON_KEY length:', supabaseAnonKey?.length);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in env. Ensure .env has correct values and restart dev server.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);