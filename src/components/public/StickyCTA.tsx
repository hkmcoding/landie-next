'use client';

import { LandingPage } from '@/types/dashboard';
import { Icons } from '@/components/icons';
import { AnalyticsTracker } from '@/lib/analytics-tracker';

interface StickyCTAProps {
  landingPage: LandingPage;
}

export function StickyCTA({ landingPage }: StickyCTAProps) {
  const ctaText = landingPage.cta_text;
  const ctaUrl = landingPage.cta_url;

  if (!ctaText || !ctaUrl) {
    return null;
  }

  const handleCtaClick = () => {
    console.log('🔗 CTA clicked:', { ctaText, ctaUrl })
    const tracker = new AnalyticsTracker(landingPage.id)
    tracker.trackCtaClick(ctaText, 'sticky_bottom')
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white/95 backdrop-blur-lg border-t border-slate-200/50 shadow-2xl">
      <div className="mx-auto max-w-md md:max-w-2xl">
        <a
          href={ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full"
          onClick={handleCtaClick}
        >
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-2xl p-4 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group">
            <div className="flex items-center justify-center gap-3">
              <span className="font-semibold text-white text-base md:text-lg">
                {ctaText}
              </span>
              <Icons.arrowRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </a>
      </div>
    </div>
  );
}