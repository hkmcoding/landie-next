'use client';

import React from 'react';
import { Testimonial } from '@/types/dashboard';
import { Icons } from '@/components/icons';
import Image from 'next/image';
import { ImageFallback } from '@/components/ui/ImageFallback';
import clsx from 'clsx';
import { AnalyticsTrackerSingleton } from '@/lib/analytics-singleton';

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
  landingPageId?: string;
}

export function TestimonialsSection({ testimonials, landingPageId }: TestimonialsSectionProps) {
  if (!testimonials || testimonials.length === 0) {
    return null;
  }

  return (
    <section className="py-6 md:py-12 px-4">
      <div className="mx-auto max-w-md md:max-w-2xl">
        <div className="text-center mb-4 md:mb-6">
          <h2 className="heading-5 mb-2 text-slate-800">
            Testimonials
          </h2>
        </div>

        <div className="space-y-3 md:space-y-4">
          {testimonials.map((testimonial) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} landingPageId={landingPageId} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ testimonial, landingPageId }: { testimonial: Testimonial; landingPageId?: string }) {
  const hasImages = testimonial.image_urls && testimonial.image_urls.length > 0;
  const hasYoutube = testimonial.youtube_url;
  
  // Create media items for slideshow - YouTube video first if present
  const mediaItems: Array<{ type: 'image' | 'video', url: string, id: string }> = [];
  if (hasYoutube && testimonial.youtube_url) {
    mediaItems.push({ type: 'video' as const, url: testimonial.youtube_url, id: 'video' });
  }
  if (hasImages) {
    testimonial.image_urls.forEach((url, index) => {
      mediaItems.push({ type: 'image' as const, url, id: `img-${index}` });
    });
  }

  // Handle click tracking
  const handleTestimonialClick = () => {
    if (landingPageId && hasYoutube) {
      AnalyticsTrackerSingleton.trackCtaClick(landingPageId, 'Watch Video Testimonial', 'testimonial_card');
    }
  };

  // If there's a YouTube video, make it clickable
  const CardWrapper = ({ children }: { children: React.ReactNode }) => {
    if (hasYoutube && testimonial.youtube_url) {
      return (
        <a
          href={testimonial.youtube_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full"
          onClick={handleTestimonialClick}
        >
          {children}
        </a>
      );
    }
    return <div>{children}</div>;
  };

  return (
    <CardWrapper>
      <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:scale-[1.02] cursor-pointer group">
        
        {/* Media Section */}
        {mediaItems.length > 0 && (
          <div className="relative h-48 md:h-56 bg-gradient-to-br from-blue-50 to-indigo-50">
            <MediaSlideshow mediaItems={mediaItems} />
          </div>
        )}

        {/* Content Section */}
        <div className="p-4">
          {testimonial.quote && (
            <div className="mb-3">
              <div className="flex mb-2">
                <Icons.quote className="w-5 h-5 text-slate-400 flex-shrink-0" />
              </div>
              <p className="paragraph text-slate-700 italic">
                "{testimonial.quote}"
              </p>
            </div>
          )}
          
          {testimonial.author_name && (
            <div className="mb-2">
              <p className="subtitle-4 text-slate-800">
                {testimonial.author_name}
              </p>
            </div>
          )}
          
          {testimonial.description && (
            <p className="paragraph text-slate-600 mb-3">
              {testimonial.description}
            </p>
          )}

          {/* Action indicator for video testimonials */}
          {hasYoutube && (
            <div className="flex items-center justify-between">
              <span className="caption-sm text-slate-500">
                Watch Video Testimonial
              </span>
              <Icons.arrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </div>
          )}
        </div>
      </div>
    </CardWrapper>
  );
}

function MediaSlideshow({ mediaItems }: { mediaItems: Array<{ type: 'image' | 'video', url: string, id: string }> }) {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  // Auto-advance slideshow if multiple items
  React.useEffect(() => {
    if (mediaItems.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % mediaItems.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [mediaItems.length]);

  const currentItem = mediaItems[currentIndex];

  return (
    <div className="relative w-full h-full group/media">
      {currentItem.type === 'image' ? (
        currentItem.url ? (
          <Image
            src={currentItem.url}
            alt="Testimonial"
            fill
            className={clsx("object-cover")}
            sizes="(max-width: 768px) 100vw, 50vw"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <ImageFallback size={80} rounded="md" />
          </div>
        )
      ) : (
        <div className="relative w-full h-full bg-black/20 flex items-center justify-center">
          <div className="absolute inset-0">
            <Image
              src={`https://img.youtube.com/vi/${getYouTubeVideoId(currentItem.url)}/maxresdefault.jpg`}
              alt="Video testimonial thumbnail"
              fill
              className={clsx("object-cover")}
              sizes="(max-width: 768px) 100vw, 50vw"
              loading="lazy"
            />
          </div>
          <div className="relative z-10 bg-black/60 rounded-full p-4">
            <Icons.play className="w-8 h-8 text-white" />
          </div>
        </div>
      )}

      {/* Slideshow indicators */}
      {mediaItems.length > 1 && (
        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {mediaItems.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}

      {/* Navigation arrows for multiple items */}
      {mediaItems.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCurrentIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
            }}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/60 text-white rounded-full p-2 opacity-0 group-hover/media:opacity-100 transition-opacity"
          >
            <Icons.arrowRight className="w-4 h-4 rotate-180" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCurrentIndex((prev) => (prev + 1) % mediaItems.length);
            }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/60 text-white rounded-full p-2 opacity-0 group-hover/media:opacity-100 transition-opacity"
          >
            <Icons.arrowRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}

function getYouTubeVideoId(url: string): string {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : '';
}