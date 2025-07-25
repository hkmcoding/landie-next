import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicLandingPage } from '@/components/public/PublicLandingPage';
import { getPublicLandingPage } from '@/lib/supabase/public-service';

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const data = await getPublicLandingPage(resolvedParams.username);
    
    if (!data) {
      return {
        title: 'Profile Not Found',
        description: 'This profile could not be found.',
      };
    }

    const { landingPage } = data;
    const name = landingPage?.name || landingPage?.username || 'Coach';
    const title = `${name} | Landie`;
    const description = landingPage?.subheadline || landingPage?.headline || 'Personal coaching page';
    
    // Determine the base URL - use environment variable or fallback
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://landie.co';
    const ogImageUrl = `${baseUrl}/${resolvedParams.username}/opengraph-image`;
    
    return {
      title,
      description,
      openGraph: {
        type: 'website',
        title,
        description,
        url: `${baseUrl}/${resolvedParams.username}`,
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: `${name} - Landie Profile`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImageUrl],
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Profile Not Found',
      description: 'This profile could not be found.',
    };
  }
}

export default async function PublicProfilePage({ params }: PageProps) {
  try {
    const resolvedParams = await params;
    const data = await getPublicLandingPage(resolvedParams.username);
    
    if (!data) {
      notFound();
    }

    return <PublicLandingPage data={data} />;
  } catch (error) {
    console.error('Error loading public profile:', error);
    notFound();
  }
}