"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "./DashboardLayout"
import { ProfileSection } from "./sections/ProfileSection"
import { ServicesSection } from "./sections/ServicesSection"
import { HighlightsSection } from "./sections/HighlightsSection"
import { TestimonialsSection } from "./sections/TestimonialsSection"
import { SocialLinksSection } from "./sections/SocialLinksSection"
import { CallToActionSection } from "./sections/CallToActionSection"
import { AboutSection } from "./sections/AboutSection"
import { AnalyticsSection } from "./sections/AnalyticsSection"
import { DashboardSection, DashboardData } from "@/types/dashboard"
import { DashboardServiceClient } from "@/lib/supabase/dashboard-service-client"
import { createClient } from "@/lib/supabase/client"

export function DashboardContainer() {
  const [activeSection, setActiveSection] = useState<DashboardSection>('profile')
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()
  const dashboardService = new DashboardServiceClient()

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setIsLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setError('No user found')
          return
        }

        const data = await dashboardService.getDashboardData(user.id)
        setDashboardData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  const handleDataUpdate = (newData: Partial<DashboardData>) => {
    setDashboardData(prev => prev ? { ...prev, ...newData } : null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-description">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-error">{error}</p>
        </div>
      </div>
    )
  }

  const renderActiveSection = () => {
    if (!dashboardData) return null

    switch (activeSection) {
      case 'profile':
        return (
          <ProfileSection 
            landingPage={dashboardData.landingPage}
            onUpdate={handleDataUpdate}
          />
        )
      case 'analytics':
        return (
          <AnalyticsSection 
            dashboardData={dashboardData}
            userId={dashboardData.landingPage?.user_id || ''}
          />
        )
      case 'services':
        return (
          <ServicesSection 
            services={dashboardData.services}
            landingPageId={dashboardData.landingPage?.id}
            onUpdate={handleDataUpdate}
          />
        )
      case 'highlights':
        return (
          <HighlightsSection 
            highlights={dashboardData.highlights}
            landingPageId={dashboardData.landingPage?.id}
            onUpdate={handleDataUpdate}
          />
        )
      case 'testimonials':
        return (
          <TestimonialsSection 
            testimonials={dashboardData.testimonials}
            landingPageId={dashboardData.landingPage?.id}
            onUpdate={handleDataUpdate}
          />
        )
      case 'social':
        return (
          <SocialLinksSection 
            landingPage={dashboardData.landingPage}
            onUpdate={handleDataUpdate}
          />
        )
      case 'cta':
        return (
          <CallToActionSection 
            landingPage={dashboardData.landingPage}
            onUpdate={handleDataUpdate}
          />
        )
      case 'about':
        return (
          <AboutSection 
            landingPage={dashboardData.landingPage}
            onUpdate={handleDataUpdate}
          />
        )
      default:
        return null
    }
  }

  return (
    <DashboardLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      userInfo={{
        name: dashboardData?.landingPage?.name || undefined,
        email: dashboardData?.landingPage?.contact_email || undefined,
        profileImage: dashboardData?.landingPage?.profile_image_url || undefined
      }}
    >
      {renderActiveSection()}
    </DashboardLayout>
  )
}