'use client';

import { LandingPage } from '@/types/dashboard';
import { Icons } from '@/components/icons';

interface ContactSectionProps {
  landingPage: LandingPage;
}

export function ContactSection({ landingPage }: ContactSectionProps) {
  const hasContactEmail = landingPage.contact_email && landingPage.contact_email.trim().length > 0;
  const showContactForm = landingPage.show_contact_form;

  // Only hide if we explicitly have no contact methods
  if (!hasContactEmail && !showContactForm) {
    return null;
  }

  return (
    <section className="py-6 md:py-12 px-4">
      <div className="container mx-auto max-w-md md:max-w-2xl">
        <div className="text-center mb-4 md:mb-6">
          <h2 className="heading-5 mb-2 text-slate-800">
            Contact
          </h2>
        </div>

        <div className="space-y-3 md:space-y-4">
          
          {/* Email Contact */}
          {hasContactEmail && (
            <a
              href={`mailto:${landingPage.contact_email}`}
              className="block w-full"
            >
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 hover:border-purple-300 transition-all duration-300 hover:scale-[1.02] cursor-pointer group hover:bg-purple-50/30">
                <div className="flex items-center gap-4">
                  <div className="shrink-0">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center group-hover:from-purple-200 group-hover:to-indigo-200 transition-all duration-300">
                      <Icons.mail className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="subtitle-4 text-slate-800">
                      Email Me
                    </h3>
                    <p className="caption text-slate-600">
                      {landingPage.contact_email}
                    </p>
                  </div>
                  
                  <div className="shrink-0">
                    <Icons.arrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
                  </div>
                </div>
              </div>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}