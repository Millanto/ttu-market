import { createClient } from '@supabase/supabase-js';

const supabaseUrlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// If configuration is empty, use a valid-format placeholder to prevent library startup crash
const isSupabaseConfigured = !!(supabaseUrlRaw && supabaseAnonKey && !supabaseUrlRaw.includes('placeholder'));
const supabaseUrl = isSupabaseConfigured ? supabaseUrlRaw : 'https://placeholder.supabase.co';
const supabaseAnonKeyToUse = isSupabaseConfigured ? supabaseAnonKey : 'placeholder_anon_key';

if (!isSupabaseConfigured) {
  console.warn('⚠️ Supabase config keys are currently empty. App is running in high-fidelity local sandbox mode.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKeyToUse);
export { isSupabaseConfigured };
