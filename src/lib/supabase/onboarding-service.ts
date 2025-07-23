import { DashboardServiceClient } from './dashboard-service-client';
import { UpdateLandingPageInput } from '@/types/dashboard';

export interface OnboardingData {
  // Step 1 - User Info
  name: string;
  username: string;
  additionalInfo?: string;
  
  // Step 2 - About/Bio
  headline: string;
  subheadline: string;
  bio: string;
  
  // Step 3 - Services
  servicesCount: number;
  services: Array<{
    title: string;
    description: string;
  }>;
  
  // Step 4 - Highlights
  highlightsCount: number;
  highlights: Array<{
    title: string;
    description: string;
  }>;
  
  // Step 5 - CTA
  wantsContactForm: boolean;
  contactEmail: string;
  wantsCTAButton: boolean;
  ctaText: string;
  ctaUrl: string;
}

export class OnboardingService {
  private dashboardService: DashboardServiceClient;

  constructor() {
    this.dashboardService = new DashboardServiceClient();
  }

  async saveOnboardingProgress(userId: string, data: OnboardingData): Promise<void> {
    try {
      const landingPageData: UpdateLandingPageInput = {
        name: data.name,
        username: data.username,
        headline: data.headline,
        subheadline: data.subheadline,
        bio: data.bio,
        contact_email: data.contactEmail,
        show_contact_form: data.wantsContactForm,
        cta_text: data.ctaText,
        cta_url: data.ctaUrl
      };

      // Try to update existing landing page, if it doesn't exist, create one
      try {
        await this.dashboardService.updateLandingPage(userId, landingPageData);
      } catch (updateError) {
        // If update fails, try to create a new landing page
        await this.dashboardService.createLandingPage(userId, landingPageData);
      }
    } catch (error) {
      console.error('Failed to save onboarding progress:', error);
      throw error;
    }
  }

  async completeOnboarding(userId: string, data: OnboardingData): Promise<void> {
    try {
      // First, save the landing page data
      await this.saveOnboardingProgress(userId, data);

      // Get the landing page ID
      const dashboardData = await this.dashboardService.getDashboardData(userId);
      const landingPageId = dashboardData.landingPage?.id;

      if (!landingPageId) {
        throw new Error('Landing page not found');
      }

      // Create services
      for (const service of data.services) {
        if (service.title.trim() && service.description.trim()) {
          await this.dashboardService.createService(landingPageId, {
            title: service.title,
            description: service.description,
            price: '',
            button_text: 'Learn More',
            button_url: '',
            image_urls: [],
            youtube_url: ''
          });
        }
      }

      // Create highlights
      for (const highlight of data.highlights) {
        if (highlight.title.trim() && highlight.description.trim()) {
          await this.dashboardService.createHighlight(landingPageId, {
            header: highlight.title,
            content: highlight.description
          });
        }
      }

      // Mark onboarding as completed in the landing page
      await this.dashboardService.updateLandingPage(userId, {
        ...data,
        // You might want to add an onboarding_completed flag to the schema
      });

    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      throw error;
    }
  }

  async getUserOnboardingData(userId: string): Promise<OnboardingData | null> {
    try {
      const dashboardData = await this.dashboardService.getDashboardData(userId);
      const landingPage = dashboardData.landingPage;
      
      if (!landingPage) {
        return null;
      }

      // Convert existing data back to onboarding format
      const onboardingData: OnboardingData = {
        name: landingPage.name || '',
        username: landingPage.username || '',
        headline: landingPage.headline || '',
        subheadline: landingPage.subheadline || '',
        bio: landingPage.bio || '',
        servicesCount: Math.min(dashboardData.services.length, 3) || 1,
        services: dashboardData.services.slice(0, 3).map(service => ({
          title: service.title || '',
          description: service.description || ''
        })),
        highlightsCount: Math.min(dashboardData.highlights.length, 3) || 1,
        highlights: dashboardData.highlights.slice(0, 3).map(highlight => ({
          title: highlight.header || '',
          description: highlight.content || ''
        })),
        wantsContactForm: landingPage.show_contact_form || false,
        contactEmail: landingPage.contact_email || '',
        wantsCTAButton: !!landingPage.cta_text,
        ctaText: landingPage.cta_text || '',
        ctaUrl: landingPage.cta_url || ''
      };

      return onboardingData;
    } catch (error) {
      console.error('Failed to get onboarding data:', error);
      return null;
    }
  }

  validateStep(step: number, data: OnboardingData): boolean {
    switch (step) {
      case 1:
        return data.name.trim() !== '' && data.username.trim() !== '';
      case 2:
        return data.bio.trim() !== '';
      case 3:
        return data.services.slice(0, data.servicesCount).every(service => 
          service.title.trim() !== '' && service.description.trim() !== ''
        );
      case 4:
        return data.highlights.slice(0, data.highlightsCount).every(highlight => 
          highlight.title.trim() !== '' && highlight.description.trim() !== ''
        );
      case 5:
        if (data.wantsContactForm && data.contactEmail.trim() === '') return false;
        if (data.wantsCTAButton && data.ctaText.trim() === '') return false;
        if (data.wantsCTAButton && data.ctaUrl.trim() === '') return false;
        return true;
      default:
        return true;
    }
  }
}