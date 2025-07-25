#!/usr/bin/env tsx

import { OgCacheService } from '../src/lib/og/storage'

async function setupOgCache() {
  try {
    console.log('🚀 Setting up OG cache storage bucket...')
    
    const ogCacheService = new OgCacheService()
    await ogCacheService.initializeBucket()
    
    console.log('✅ OG cache storage bucket setup complete!')
    console.log('📝 The og-cache bucket is now ready for storing generated OpenGraph images.')
    console.log('🔄 Images will be cached for 60 days and automatically regenerated when profiles are updated.')
    
  } catch (error) {
    console.error('❌ Failed to setup OG cache storage:', error)
    process.exit(1)
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupOgCache()
}

export { setupOgCache } 