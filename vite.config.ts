import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Use '.' instead of process.cwd() to avoid TS error about missing cwd on Process type
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [react()],
    define: {
      // Vital: Check process.env first to capture Vercel's injected variables during build
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY || ''),
      'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || env.SUPABASE_URL || ''),
      'process.env.SUPABASE_KEY': JSON.stringify(process.env.SUPABASE_KEY || env.SUPABASE_KEY || ''),
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
          },
        },
      },
    },
  };
});