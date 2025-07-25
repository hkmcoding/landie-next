import { getPublicLandingPage } from '@/lib/supabase/public-service'
import { renderOg, renderFallbackOg, OG_SIZE } from '@/lib/og/renderOg'

export const runtime = 'edge'
export const alt = 'Landie Profile'
export const size = OG_SIZE
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  try {
    const resolvedParams = await params
    const data = await getPublicLandingPage(resolvedParams.username)
    
    if (!data?.landingPage) {
      return renderFallbackOg()
    }

    const { landingPage } = data
    const name = landingPage.name || landingPage.username || 'Coach'
    const tagline = landingPage.subheadline || landingPage.headline || 'Personal coaching page'
    const avatarUrl = landingPage.profile_image_url

    return renderOg({
      name,
      avatarUrl,
      tagline,
    })
  } catch (error) {
    console.error('Error generating OG image:', error)
    return renderFallbackOg()
  }
} 