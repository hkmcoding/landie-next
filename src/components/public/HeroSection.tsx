'use client';

import { LandingPage } from '@/types/dashboard';
import Image from 'next/image';
import { ImageFallback } from '@/components/ui/ImageFallback';

interface HeroSectionProps {
  landingPage: LandingPage;
  profileOnly?: boolean;
}

export function HeroSection({ landingPage, profileOnly = false }: HeroSectionProps) {
  const profileImage = landingPage.profile_image_url;
  const name = landingPage.name || landingPage.username;
  const headline = landingPage.headline;
  const subheadline = landingPage.subheadline;

  // If profileOnly mode, just return the profile image
  if (profileOnly) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        {!profileImage ? (
          <ImageFallback size={120} rounded="full" />
        ) : (
          <Image
            src={profileImage}
            alt={name || 'Profile'}
            width={120}
            height={120}
            priority
            className="w-full h-full rounded-full object-cover"
            sizes="120px"
          />
        )}
      </div>
    );
  }

  return (
    <section className="px-4 pb-6">
      <div className="mx-auto max-w-md">
        <div className="text-center space-y-4">

          {/* Name */}
          {name && (
            <h1 className="heading-4 text-slate-800">
              {name}
            </h1>
          )}

          {/* Headline */}
          {headline && (
            <h2 className="subtitle-4 text-slate-600">
              {headline}
            </h2>
          )}

          {/* Subheadline */}
          {subheadline && (
            <p className="paragraph text-slate-500">
              {subheadline}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}