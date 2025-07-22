'use client';

import { LandingPage } from '@/types/dashboard';
import { Icons } from '@/components/icons';

interface SocialLinksSectionProps {
  landingPage: LandingPage;
}

export function SocialLinksSection({ landingPage }: SocialLinksSectionProps) {
  const socialLinks = [
    {
      name: 'Instagram',
      url: landingPage.instagram_url,
      icon: Icons.instagram,
      color: 'text-pink-600',
      hoverColor: 'group-hover:text-pink-700',
      bgColor: 'bg-gradient-to-br from-pink-100 to-rose-100',
      hoverBgColor: 'hover:from-pink-200 hover:to-rose-200',
    },
    {
      name: 'YouTube',
      url: landingPage.youtube_url,
      icon: Icons.youtube,
      color: 'text-red-600',
      hoverColor: 'group-hover:text-red-700',
      bgColor: 'bg-gradient-to-br from-red-100 to-orange-100',
      hoverBgColor: 'hover:from-red-200 hover:to-orange-200',
    },
  ].filter(link => link.url);

  if (socialLinks.length === 0) {
    return null;
  }

  return (
    <section className="py-6 md:py-12 px-4">
      <div className="mx-auto max-w-md md:max-w-2xl">
        <div className="text-center mb-4 md:mb-6">
          <h2 className="heading-5 mb-2 text-slate-800">
            Connect
          </h2>
        </div>

        <div className="space-y-3 md:space-y-4">
          {socialLinks.map((link) => (
            <a
              key={link.name}
              href={link.url || ''}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full"
            >
              <div className={`bg-gray-50 rounded-2xl p-4 border border-gray-200 transition-all duration-300 hover:scale-[1.02] cursor-pointer group ${link.name === 'Instagram' ? 'hover:border-pink-300 hover:bg-pink-50/30' : 'hover:border-red-300 hover:bg-red-50/30'}`}>
                <div className="flex items-center gap-4">
                  <div className="shrink-0">
                    <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl flex items-center justify-center ${link.bgColor} ${link.hoverBgColor} transition-all duration-300`}>
                      <link.icon className={`w-5 h-5 md:w-6 md:h-6 ${link.color} ${link.hoverColor} transition-colors duration-300`} />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="subtitle-4 text-slate-800">
                      {link.name}
                    </h3>
                    <p className="caption text-slate-600">
                      Follow me on {link.name}
                    </p>
                  </div>
                  
                  <div className="shrink-0">
                    <Icons.arrowRight className={`w-4 h-4 text-slate-400 ${link.hoverColor} transition-colors duration-300`} />
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}