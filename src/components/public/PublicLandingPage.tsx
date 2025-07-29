'use client';

import { DashboardData } from '@/types/dashboard';
import { HeroSection } from './HeroSection';
import dynamic from 'next/dynamic';
import { ProfileMenu } from './ProfileMenu';
import { AnalyticsTrackerSingleton } from '@/lib/analytics-singleton';
import { useEffect, useRef } from 'react';

// Lazy load sections that are not immediately visible
const ServicesSection = dynamic(() => import('./ServicesSection').then(mod => ({ default: mod.ServicesSection })), {
  loading: () => <div className="py-12 px-4"><div className="animate-pulse bg-gray-100 h-32 rounded-2xl"></div></div>
});
const TestimonialsSection = dynamic(() => import('./TestimonialsSection').then(mod => ({ default: mod.TestimonialsSection })), {
  loading: () => <div className="py-12 px-4"><div className="animate-pulse bg-gray-100 h-28 rounded-2xl"></div></div>
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
  const { landingPage, services, highlights, testimonials } = data;
  
  // Refs for section tracking
  const heroRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const highlightsRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);
  const testimonialsRef = useRef<HTMLDivElement>(null);
  const socialRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);

  // Initialize analytics tracking when component mounts
  useEffect(() => {
    if (landingPage?.id) {
      console.log('🚀 Initializing analytics for landing page:', landingPage.id)
      
      // Use singleton to prevent multiple tracker instances
      const cleanup = AnalyticsTrackerSingleton.initializeTracking(landingPage.id)
      
      // Initialize section tracking
      const sections = [
        { name: 'hero', element: heroRef.current, index: 0 },
        { name: 'about', element: aboutRef.current, index: 1 },
        { name: 'highlights', element: highlightsRef.current, index: 2 },
        { name: 'services', element: servicesRef.current, index: 3 },
        { name: 'testimonials', element: testimonialsRef.current, index: 4 },
        { name: 'social', element: socialRef.current, index: 5 },
        { name: 'contact', element: contactRef.current, index: 6 }
      ].filter(section => section.element !== null) as { name: string; element: HTMLElement; index: number }[]
      
      const sectionCleanup = AnalyticsTrackerSingleton.initializeSectionTracking(landingPage.id, sections)
      
      // Combined cleanup function
      return () => {
        cleanup()
        sectionCleanup()
      }
    }
  }, [landingPage?.id])

  if (!landingPage) {
    return (
      <div className="min-h-safe flex items-center justify-center">
        <div className="text-center">
          <h1 className="heading-2 mb-4">Profile Not Found</h1>
          <p className="text-muted-foreground">This profile could not be found or is not available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-safe bg-gray-100 relative">
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
        <div ref={heroRef}>
          <HeroSection landingPage={landingPage} profileOnly={false} />
        </div>
        
        {landingPage.bio && (
          <div ref={aboutRef}>
            <AboutSection bio={landingPage.bio} />
          </div>
        )}
        
        {highlights && highlights.length > 0 && (
          <div ref={highlightsRef}>
            <HighlightsSection highlights={highlights} />
          </div>
        )}
        
        {services && services.length > 0 && (
          <div ref={servicesRef}>
            <ServicesSection services={services} landingPageId={landingPage.id} />
          </div>
        )}
        
        {testimonials && testimonials.length > 0 && (
          <div ref={testimonialsRef}>
            <TestimonialsSection testimonials={testimonials} landingPageId={landingPage.id} />
          </div>
        )}
        
        <div ref={socialRef}>
          <SocialLinksSection landingPage={landingPage} />
        </div>
        
        <div ref={contactRef}>
          <ContactSection landingPage={landingPage} />
        </div>
        
        <FooterSection />
        
        {/* Add bottom padding to account for sticky CTA */}
        {(landingPage.cta_text && landingPage.cta_url) && (
          <div className="pb-24"></div>
        )}
      </div>
      
      {/* Sticky CTA */}
      <StickyCTA landingPage={landingPage} />
    </div>
  );
}