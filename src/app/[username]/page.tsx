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
    
    return {
      title: `${landingPage?.name || landingPage?.username} - ${landingPage?.headline || 'Professional Profile'}`,
      description: landingPage?.subheadline || landingPage?.bio || `Professional profile for ${landingPage?.name || landingPage?.username}`,
      openGraph: {
        title: `${landingPage?.name || landingPage?.username} - ${landingPage?.headline || 'Professional Profile'}`,
        description: landingPage?.subheadline || landingPage?.bio || `Professional profile for ${landingPage?.name || landingPage?.username}`,
        images: landingPage?.profile_image_url ? [landingPage?.profile_image_url] : [],
        type: 'profile',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${landingPage?.name || landingPage?.username} - ${landingPage?.headline || 'Professional Profile'}`,
        description: landingPage?.subheadline || landingPage?.bio || `Professional profile for ${landingPage?.name || landingPage?.username}`,
        images: landingPage?.profile_image_url ? [landingPage?.profile_image_url] : [],
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