import { describe, test, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

describe('Project Organization', () => {
  const rootDir = process.cwd()
  
  describe('Documentation Structure', () => {
    test('should have organized docs directory structure', () => {
      // Check main docs directory exists
      expect(existsSync(join(rootDir, 'docs'))).toBe(true)
      expect(existsSync(join(rootDir, 'docs/README.md'))).toBe(true)
      
      // Check subdirectories exist
      expect(existsSync(join(rootDir, 'docs/implementation'))).toBe(true)
      expect(existsSync(join(rootDir, 'docs/performance'))).toBe(true)
      expect(existsSync(join(rootDir, 'docs/guides'))).toBe(true)
    })

    test('should have moved implementation docs to correct location', () => {
      expect(existsSync(join(rootDir, 'docs/implementation/PRO_FEATURE_FIX.md'))).toBe(true)
      expect(existsSync(join(rootDir, 'docs/implementation/PRO_FEATURE_IMPLEMENTATION.md'))).toBe(true)
      
      // Should not exist in root anymore
      expect(existsSync(join(rootDir, 'PRO_FEATURE_FIX.md'))).toBe(false)
      expect(existsSync(join(rootDir, 'PRO_FEATURE_IMPLEMENTATION.md'))).toBe(false)
    })

    test('should have moved performance docs to correct location', () => {
      expect(existsSync(join(rootDir, 'docs/performance/PERFORMANCE_OPTIMIZATION_SUMMARY.md'))).toBe(true)
      expect(existsSync(join(rootDir, 'docs/performance/PERFORMANCE_VERIFICATION_GUIDE.md'))).toBe(true)
      
      // Should not exist in root anymore
      expect(existsSync(join(rootDir, 'PERFORMANCE_OPTIMIZATION_SUMMARY.md'))).toBe(false)
      expect(existsSync(join(rootDir, 'PERFORMANCE_VERIFICATION_GUIDE.md'))).toBe(false)
    })

    test('should have preserved important root files', () => {
      expect(existsSync(join(rootDir, 'README.md'))).toBe(true)
      expect(existsSync(join(rootDir, 'cursor.md'))).toBe(true)
    })
  })

  describe('Scripts Organization', () => {
    test('should have moved verification script to debug directory', () => {
      expect(existsSync(join(rootDir, 'scripts/debug/dashboard-query-verification.js'))).toBe(true)
      
      // Should not exist in root anymore
      expect(existsSync(join(rootDir, 'dashboard-query-verification.js'))).toBe(false)
    })

    test('should have kept performance script in scripts directory', () => {
      expect(existsSync(join(rootDir, 'scripts/performance-test.js'))).toBe(true)
    })
  })

  describe('Database Organization', () => {
    test('should have moved SQL optimization to migrations', () => {
      expect(existsSync(join(rootDir, 'supabase/migrations/supabase-optimization.sql'))).toBe(true)
      
      // Should not exist in root anymore
      expect(existsSync(join(rootDir, 'supabase-optimization.sql'))).toBe(false)
    })
  })

  describe('Clean Root Directory', () => {
    test('should have clean root directory with only config files', () => {
      const expectedRootFiles = [
        'README.md',
        'cursor.md',
        'package.json',
        'tsconfig.json',
        'next.config.ts',
        'tailwind.config.ts',
        'vitest.config.ts',
        'playwright.config.ts',
        'eslint.config.mjs',
        'postcss.config.mjs',
        'postcss.test.config.mjs',
        'components.json',
        'middleware.ts',
        'next-env.d.ts',
        'tsconfig.tsbuildinfo',
        'yarn.lock',
        'LICENSE'
      ]

      // All expected files should exist
      expectedRootFiles.forEach(file => {
        expect(existsSync(join(rootDir, file))).toBe(true)
      })

      // No stray markdown documentation files should remain
      const strayFiles = [
        'PERFORMANCE_OPTIMIZATION_SUMMARY.md',
        'PERFORMANCE_VERIFICATION_GUIDE.md', 
        'PRO_FEATURE_FIX.md',
        'PRO_FEATURE_IMPLEMENTATION.md',
        'dashboard-query-verification.js',
        'supabase-optimization.sql'
      ]

      strayFiles.forEach(file => {
        expect(existsSync(join(rootDir, file))).toBe(false)
      })
    })
  })
})