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

  // Initialize tracking when the page loads
  initializeTracking() {
    
    // Track page view and unique visitor immediately
    this.trackPageView()
    this.trackUniqueVisitor()

    // Track page time when user leaves
    const handleBeforeUnload = () => {
      this.trackPageTime()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        this.trackPageTime()
      }
    }

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Track page time periodically (every 30 seconds)
    const intervalId = setInterval(() => {
      this.trackPageTime()
    }, 30000)

    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(intervalId)
    }
  }
}

export { AnalyticsTracker }