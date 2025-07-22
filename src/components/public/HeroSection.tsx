'use client';

import { LandingPage } from '@/types/dashboard';
import Image from 'next/image';

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
      <>
        {profileImage ? (
          <Image
            src={profileImage}
            alt={name || 'Profile'}
            width={120}
            height={120}
            className="object-cover w-full h-full"
            priority
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <div className="text-3xl font-semibold text-gray-400">
              {name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          </div>
        )}
      </>
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