import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node', // Use node environment for database tests
    setupFiles: ['./tests/analytics/setup.ts'],
    include: ['tests/analytics/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['tests/analytics/_helpers.ts', 'tests/analytics/setup.ts', 'node_modules/**/*'],
    testTimeout: 30000, // Longer timeout for database operations
    hookTimeout: 30000,
    globals: true,
    sequence: {
      concurrent: false // Run analytics tests sequentially to avoid DB conflicts
    },
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})