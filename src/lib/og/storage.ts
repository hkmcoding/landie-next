import { createClient } from '@supabase/supabase-js'
import { renderOg, OgData } from './renderOg'

const BUCKET_NAME = 'og-cache'
const CACHE_TTL_DAYS = 60

export class OgCacheService {
  private supabase: ReturnType<typeof createClient>

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration for OG cache service')
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  /**
   * Generate the cache file path for a username
   */
  private getCacheKey(username: string): string {
    return `${username}.png`
  }

  /**
   * Check if cached OG image exists and is fresh
   */
  async getCachedOgImage(username: string): Promise<string | null> {
    try {
      const cacheKey = this.getCacheKey(username)
      
      // Check if file exists
      const { data: file, error } = await this.supabase.storage
        .from(BUCKET_NAME)
        .list('', { 
          limit: 1,
          search: cacheKey,
        })

      if (error || !file || file.length === 0) {
        return null
      }

      const fileInfo = file[0]
      const fileAge = Date.now() - new Date(fileInfo.created_at).getTime()
      const maxAge = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000 // Convert to milliseconds

      // Check if cache is expired
      if (fileAge > maxAge) {
        await this.removeCachedOgImage(username)
        return null
      }

      // Return public URL
      const { data } = this.supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(cacheKey)

      return data.publicUrl
    } catch (error) {
      console.error('Error checking cached OG image:', error)
      return null
    }
  }

  /**
   * Generate and cache OG image
   */
  async generateAndCacheOgImage(username: string, ogData: OgData): Promise<string> {
    try {
      // Generate the OG image
      const imageResponse = await renderOg(ogData)
      const imageBuffer = await imageResponse.arrayBuffer()
      
      const cacheKey = this.getCacheKey(username)
      
      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(BUCKET_NAME)
        .upload(cacheKey, imageBuffer, {
          contentType: 'image/png',
          cacheControl: `${CACHE_TTL_DAYS * 24 * 3600}`, // Cache control in seconds
          upsert: true, // Overwrite if exists
        })

      if (error) {
        throw error
      }

      // Return public URL
      const { data: urlData } = this.supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path)

      return urlData.publicUrl
    } catch (error) {
      console.error('Error generating and caching OG image:', error)
      throw error
    }
  }

  /**
   * Remove cached OG image (for cache busting when profile updates)
   */
  async removeCachedOgImage(username: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(username)
      
      const { error } = await this.supabase.storage
        .from(BUCKET_NAME)
        .remove([cacheKey])

      if (error) {
        console.error('Error removing cached OG image:', error)
        // Don't throw error here as this is cleanup
      }
    } catch (error) {
      console.error('Error in removeCachedOgImage:', error)
    }
  }

  /**
   * Get or generate cached OG image
   */
  async getOrGenerateOgImage(username: string, ogData: OgData): Promise<string> {
    // Try to get cached version first
    const cachedUrl = await this.getCachedOgImage(username)
    if (cachedUrl) {
      return cachedUrl
    }

    // Generate and cache new image
    return this.generateAndCacheOgImage(username, ogData)
  }

  /**
   * Initialize the OG cache bucket (call this during setup)
   */
  async initializeBucket(): Promise<void> {
    try {
      // Check if bucket exists
      const { data: buckets, error: listError } = await this.supabase.storage.listBuckets()
      
      if (listError) {
        throw listError
      }

      const bucketExists = buckets.some(bucket => bucket.name === BUCKET_NAME)
      
      if (!bucketExists) {
        // Create bucket
        const { error: createError } = await this.supabase.storage.createBucket(BUCKET_NAME, {
          public: true,
          allowedMimeTypes: ['image/png'],
          fileSizeLimit: 5242880, // 5MB
        })

        if (createError) {
          throw createError
        }

        console.log(`Created OG cache bucket: ${BUCKET_NAME}`)
      }
    } catch (error) {
      console.error('Error initializing OG cache bucket:', error)
      throw error
    }
  }
} 