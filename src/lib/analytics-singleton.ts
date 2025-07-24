import { AnalyticsTracker } from './analytics-tracker';

/**
 * Singleton wrapper for AnalyticsTracker to prevent multiple instances
 * that cause inflated page view counts
 */
class AnalyticsTrackerSingleton {
  private static instance: AnalyticsTracker | null = null;
  private static currentLandingPageId: string | null = null;
  private static hasInitialized: boolean = false;

  /**
   * Get or create the analytics tracker instance
   */
  static getInstance(landingPageId: string): AnalyticsTracker {
    // Only create new instance if landing page changes
    if (!this.instance || this.currentLandingPageId !== landingPageId) {
      console.log('🔄 Creating new analytics tracker for:', landingPageId);
      this.instance = new AnalyticsTracker(landingPageId);
      this.currentLandingPageId = landingPageId;
      this.hasInitialized = false;
    }
    return this.instance;
  }

  /**
   * Initialize tracking only once per landing page
   */
  static initializeTracking(landingPageId: string): () => void {
    const tracker = this.getInstance(landingPageId);
    
    // Only initialize once per landing page
    if (!this.hasInitialized) {
      console.log('🚀 Initializing analytics tracking for:', landingPageId);
      const cleanup = tracker.initializeTracking();
      this.hasInitialized = true;
      
      return () => {
        cleanup();
        this.hasInitialized = false;
      };
    }
    
    // Return no-op cleanup if already initialized
    return () => {};
  }

  /**
   * Initialize section tracking only once per landing page
   */
  static initializeSectionTracking(
    landingPageId: string, 
    sections: { name: string; element: HTMLElement; index: number }[]
  ): () => void {
    const tracker = this.getInstance(landingPageId);
    return tracker.initializeSectionTracking(sections);
  }

  /**
   * Track CTA click without creating new tracker instance
   */
  static trackCtaClick(landingPageId: string, ctaText: string, ctaPosition: string): Promise<any> {
    const tracker = this.getInstance(landingPageId);
    return tracker.trackCtaClick(ctaText, ctaPosition);
  }

  /**
   * Reset singleton (useful for testing or page navigation)
   */
  static reset(): void {
    console.log('🔄 Resetting analytics tracker singleton');
    this.instance = null;
    this.currentLandingPageId = null;
    this.hasInitialized = false;
  }
}

export { AnalyticsTrackerSingleton };