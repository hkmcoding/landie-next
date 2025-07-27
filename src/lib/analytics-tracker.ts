class AnalyticsTracker {
  private visitorId: string
  private sessionId: string
  private sessionStart: Date
  private landingPageId: string

  constructor(landingPageId: string) {
    this.landingPageId = landingPageId
    this.visitorId = this.getOrCreateVisitorId()
    this.sessionId = this.getOrCreateSessionId()
    this.sessionStart = new Date()
  }

  private getOrCreateVisitorId(): string {
    if (typeof window === 'undefined') return ''
    
    const stored = localStorage.getItem('landie_visitor_id')
    if (stored) {
      return stored
    }
    
    const newId = crypto.randomUUID()
    localStorage.setItem('landie_visitor_id', newId)
    return newId
  }

  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return ''
    
    const stored = sessionStorage.getItem('landie_session_id')
    if (stored) {
      return stored
    }
    
    const newId = crypto.randomUUID()
    sessionStorage.setItem('landie_session_id', newId)
    return newId
  }

  private async sendEvent(type: string, data: Record<string, any> = {}) {
    try {
      
      const response = await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          landing_page_id: this.landingPageId,
          visitor_id: this.visitorId,
          session_id: this.sessionId,
          data
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        console.error(`Failed to track ${type}:`, result)
      }
      
      return result
    } catch (error) {
      console.error(`Error tracking ${type}:`, error)
      return { error }
    }
  }

  async trackPageView() {
    return this.sendEvent('page_view', {
      url: window.location.href,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString()
    })
  }

  async trackUniqueVisitor() {
    return this.sendEvent('unique_visitor', {
      user_agent: navigator.userAgent,
      referrer: document.referrer,
      timestamp: new Date().toISOString()
    })
  }

  async trackCtaClick(ctaText: string, ctaPosition: string) {
    return this.sendEvent('cta_click', {
      cta_text: ctaText,
      cta_position: ctaPosition,
      url: window.location.href,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString()
    })
  }

  async trackPageTime() {
    const sessionEnd = new Date()
    const durationSeconds = Math.round((sessionEnd.getTime() - this.sessionStart.getTime()) / 1000)
    
    return this.sendEvent('page_time', {
      session_start: this.sessionStart.toISOString(),
      session_end: sessionEnd.toISOString(),
      duration_seconds: durationSeconds
    })
  }

  async trackSectionView(sectionName: string, sectionIndex: number) {
    return this.sendEvent('section_view', {
      section: sectionName,
      index: sectionIndex,
      timestamp: new Date().toISOString()
    })
  }

  // Initialize section view tracking with intersection observer
  initializeSectionTracking(sections: { name: string; element: HTMLElement; index: number }[]) {
    if (typeof window === 'undefined') return () => {}

    // Track which sections have already been viewed to prevent duplicates
    const viewedSections = new Set<string>()

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionData = sections.find(s => s.element === entry.target)
            if (sectionData && !viewedSections.has(sectionData.name)) {
              viewedSections.add(sectionData.name)
              this.trackSectionView(sectionData.name, sectionData.index)
            }
          }
        })
      },
      {
        threshold: 0.5, // Track when 50% of section is visible
        rootMargin: '0px 0px -50px 0px' // Add some margin to avoid premature triggering
      }
    )

    // Observe all sections
    sections.forEach(section => {
      observer.observe(section.element)
    })

    // Cleanup function
    return () => {
      observer.disconnect()
      viewedSections.clear()
    }
  }

  // Initialize tracking when the page loads
  initializeTracking() {
    let hasTrackedPageView = false
    let hasTrackedUniqueVisitor = false
    
    // Track page view and unique visitor immediately - but only once
    if (!hasTrackedPageView) {
      this.trackPageView()
      hasTrackedPageView = true
    }
    
    if (!hasTrackedUniqueVisitor) {
      this.trackUniqueVisitor()
      hasTrackedUniqueVisitor = true
    }

    // Track page time when user leaves - but only once per session
    let hasTrackedPageTime = false
    
    const handleBeforeUnload = () => {
      if (!hasTrackedPageTime) {
        this.trackPageTime()
        hasTrackedPageTime = true
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !hasTrackedPageTime) {
        this.trackPageTime()
        hasTrackedPageTime = true
      }
    }

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Remove the periodic tracking - this was causing inflated counts
    // Instead, track page time once when user activity stops

    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      
      // Track final page time if not already tracked
      if (!hasTrackedPageTime) {
        this.trackPageTime()
      }
    }
  }
}

export { AnalyticsTracker }