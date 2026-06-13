import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import dotenv from 'dotenv';
import fs from 'fs';

// Load env vars
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config();
}

export default defineConfig(() => {
  const supabaseUrlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseUrl = supabaseUrlRaw.includes('.') ? supabaseUrlRaw : (supabaseUrlRaw ? `https://${supabaseUrlRaw}.supabase.co` : '');

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      'process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY': JSON.stringify(process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY),
      'process.env.NEXT_PUBLIC_SITE_URL': JSON.stringify(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
