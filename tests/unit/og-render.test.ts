import { describe, it, expect, vi } from 'vitest'
import { renderOg, renderFallbackOg, OG_SIZE } from '@/lib/og/renderOg'

// Mock the ImageResponse since it's not available in the test environment
vi.mock('next/og', () => ({
  ImageResponse: vi.fn().mockImplementation((element, options) => ({
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1000)),
    // Mock other ImageResponse methods as needed
    size: options?.width && options?.height ? { width: options.width, height: options.height } : OG_SIZE,
  }))
}))

describe('OG Image Rendering', () => {
  describe('renderOg', () => {
    it('should render OG image with name, avatar, and tagline', async () => {
      const ogData = {
        name: 'Jane Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
        tagline: 'Fitness Coach & Nutritionist'
      }

      const result = await renderOg(ogData)
      
      expect(result).toBeDefined()
      expect(result.arrayBuffer).toBeDefined()
    })

    it('should render OG image with name only', async () => {
      const ogData = {
        name: 'John Smith',
        avatarUrl: null,
        tagline: null
      }

      const result = await renderOg(ogData)
      
      expect(result).toBeDefined()
      expect(result.arrayBuffer).toBeDefined()
    })

    it('should handle empty name gracefully', async () => {
      const ogData = {
        name: '',
        avatarUrl: null,
        tagline: 'Coach'
      }

      const result = await renderOg(ogData)
      
      expect(result).toBeDefined()
      expect(result.arrayBuffer).toBeDefined()
    })
  })

  describe('renderFallbackOg', () => {
    it('should render fallback OG image', () => {
      const result = renderFallbackOg()
      
      expect(result).toBeDefined()
      expect(result.arrayBuffer).toBeDefined()
    })
  })

  describe('OG_SIZE', () => {
    it('should have correct dimensions', () => {
      expect(OG_SIZE.width).toBe(1200)
      expect(OG_SIZE.height).toBe(630)
    })
  })
})

describe('Clipboard utilities', () => {
  const { generateEmbedSnippet } = await import('@/lib/clipboard')

  describe('generateEmbedSnippet', () => {
    it('should generate correct embed snippet', () => {
      const snippet = generateEmbedSnippet('jane', 'Jane Doe')
      
      expect(snippet).toContain('href="https://landie.co/jane"')
      expect(snippet).toContain('title="Jane Doe – Landie"')
      expect(snippet).toContain('src="https://landie.co/jane/opengraph-image"')
      expect(snippet).toContain('width="600"')
      expect(snippet).toContain('border-radius:12px')
    })

    it('should handle usernames with special characters', () => {
      const snippet = generateEmbedSnippet('jane-doe', 'Jane Doe')
      
      expect(snippet).toContain('jane-doe')
      expect(snippet).toContain('Jane Doe')
    })
  })
}) 