'use client';

import { DashboardData } from '@/types/dashboard';
import { HeroSection } from './HeroSection';
import dynamic from 'next/dynamic';
import { ProfileMenu } from './ProfileMenu';
import { AnalyticsTracker } from '@/lib/analytics-tracker';
import { useEffect } from 'react';

// Lazy load sections that are not immediately visible
const ServicesSection = dynamic(() => import('./ServicesSection').then(mod => ({ default: mod.ServicesSection })), {
  loading: () => <div className="py-12 px-4"><div className="animate-pulse bg-gray-100 h-32 rounded-2xl"></div></div>
});
const HighlightsSection = dynamic(() => import('./HighlightsSection').then(mod => ({ default: mod.HighlightsSection })), {
  loading: () => <div className="py-12 px-4"><div className="animate-pulse bg-gray-100 h-24 rounded-2xl"></div></div>
});
const AboutSection = dynamic(() => import('./AboutSection').then(mod => ({ default: mod.AboutSection })), {
  loading: () => <div className="py-12 px-4"><div className="animate-pulse bg-gray-100 h-20 rounded-2xl"></div></div>
});
const SocialLinksSection = dynamic(() => import('./SocialLinksSection').then(mod => ({ default: mod.SocialLinksSection })), {
  loading: () => <div className="py-12 px-4"><div className="animate-pulse bg-gray-100 h-16 rounded-2xl"></div></div>
});
const ContactSection = dynamic(() => import('./ContactSection').then(mod => ({ default: mod.ContactSection })), {
  loading: () => <div className="py-12 px-4"><div className="animate-pulse bg-gray-100 h-16 rounded-2xl"></div></div>
});
const FooterSection = dynamic(() => import('./FooterSection').then(mod => ({ default: mod.FooterSection })), {
  loading: () => <div className="py-6 px-4"><div className="animate-pulse bg-gray-100 h-8 rounded"></div></div>
});
const StickyCTA = dynamic(() => import('./StickyCTA').then(mod => ({ default: mod.StickyCTA })), {
  loading: () => <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gray-100 h-16"></div>
});

interface PublicLandingPageProps {
  data: DashboardData;
}

export function PublicLandingPage({ data }: PublicLandingPageProps) {
  const { landingPage, services, highlights } = data;

  // Initialize analytics tracking when component mounts
  useEffect(() => {
    if (landingPage?.id) {
      console.log('🚀 Initializing analytics for landing page:', landingPage.id)
      const tracker = new AnalyticsTracker(landingPage.id)
      const cleanup = tracker.initializeTracking()
      
      // Cleanup when component unmounts
      return cleanup
    }
  }, [landingPage?.id])

  if (!landingPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="heading-2 mb-4">Profile Not Found</h1>
          <p className="text-muted-foreground">This profile could not be found or is not available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 relative">
      {/* Profile picture positioned to overlap */}
      <div className="relative z-20 pt-8 flex justify-center">
        <div className="w-[120px] h-[120px] rounded-full border-4 border-white overflow-hidden bg-white">
          <HeroSection landingPage={landingPage} profileOnly={true} />
        </div>
      </div>

      {/* Top-right menu */}
      <div className="absolute top-4 right-4 md:right-6 z-30">
        <ProfileMenu email={landingPage.contact_email || ''} />
      </div>

      {/* Main content area with white background, starting from profile picture middle */}
      <div className="max-w-md mx-auto bg-white shadow-sm relative z-10" style={{ marginTop: '-60px', paddingTop: '80px' }}>
        <HeroSection landingPage={landingPage} profileOnly={false} />
        
        {landingPage.bio && (
          <AboutSection bio={landingPage.bio} />
        )}
        
        {highlights && highlights.length > 0 && (
          <HighlightsSection highlights={highlights} />
        )}
        
        {services && services.length > 0 && (
          <ServicesSection services={services} />
        )}
        
        <SocialLinksSection landingPage={landingPage} />
        
        <ContactSection landingPage={landingPage} />
        
        <FooterSection />
        
        {/* Add bottom padding to account for sticky CTA */}
        <div className="pb-24"></div>
      </div>
      
      {/* Sticky CTA */}
      <StickyCTA landingPage={landingPage} />
    </div>
  );
}