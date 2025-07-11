'use client';

import React from 'react';
import { Service } from '@/types/dashboard';
import { Icons } from '@/components/icons';
import Image from 'next/image';

interface ServicesSectionProps {
  services: Service[];
}

export function ServicesSection({ services }: ServicesSectionProps) {
  if (!services || services.length === 0) {
    return null;
  }

  return (
    <section className="py-6 md:py-12 px-4">
      <div className="container mx-auto max-w-md md:max-w-2xl">
        <div className="text-center mb-4 md:mb-6">
          <h2 className="heading-5 mb-2 text-slate-800">
            Services
          </h2>
        </div>

        <div className="space-y-3 md:space-y-4">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ service }: { service: Service }) {
  const hasImages = service.image_urls && service.image_urls.length > 0;
  const hasYoutube = service.youtube_url;
  const hasPrice = service.price;
  const primaryUrl = service.button_url || service.youtube_url;
  
  // Create media items for slideshow
  const mediaItems: Array<{ type: 'image' | 'video', url: string, id: string }> = [];
  if (hasImages) {
    service.image_urls.forEach((url, index) => {
      mediaItems.push({ type: 'image' as const, url, id: `img-${index}` });
    });
  }
  if (hasYoutube && service.youtube_url) {
    mediaItems.push({ type: 'video' as const, url: service.youtube_url, id: 'video' });
  }

  // If it's clickable, make the whole card a link
  const CardWrapper = ({ children }: { children: React.ReactNode }) => {
    if (primaryUrl) {
      return (
        <a
          href={primaryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full"
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
        
        {/* Media Section - Larger and on top */}
        {mediaItems.length > 0 && (
          <div className="relative h-48 md:h-56 bg-gradient-to-br from-emerald-50 to-teal-50">
            <MediaSlideshow mediaItems={mediaItems} />
          </div>
        )}

        {/* Content Section */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="subtitle-4 text-slate-800 flex-1">
              {service.title}
            </h3>
            {hasPrice && (
              <div className="text-lg md:text-xl font-bold text-emerald-600 shrink-0 ml-3">
                {service.price}
              </div>
            )}
          </div>
          
          {service.description && (
            <p className="paragraph text-slate-600 mb-3">
              {service.description}
            </p>
          )}

          {/* Action indicator */}
          {primaryUrl && (
            <div className="flex items-center justify-between">
              <span className="caption-sm text-slate-500">
                {hasYoutube ? 'Watch Video' : 'Learn More'}
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
        <Image
          src={currentItem.url}
          alt="Service"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
        />
      ) : (
        <div className="relative w-full h-full bg-black/20 flex items-center justify-center">
          <div className="absolute inset-0">
            <Image
              src={`https://img.youtube.com/vi/${getYouTubeVideoId(currentItem.url)}/maxresdefault.jpg`}
              alt="Video thumbnail"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
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