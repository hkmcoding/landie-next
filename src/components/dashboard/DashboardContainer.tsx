"use client"

import { useState } from "react"
import { DashboardLayout } from "./DashboardLayout"
import { ProfileSection } from "./sections/ProfileSection"
import { AboutSection } from "./sections/AboutSection"
import { SocialLinksSection } from "./sections/SocialLinksSection"
import { CallToActionSection } from "./sections/CallToActionSection"
import { ServicesSection } from "./sections/ServicesSection"
import { HighlightsSection } from "./sections/HighlightsSection"
import { TestimonialsSection } from "./sections/TestimonialsSection"
import { AnalyticsSection } from "./sections/AnalyticsSection"
import { DashboardSection, DashboardData } from "@/types/dashboard"
import { useDashboardData } from "@/contexts/DashboardDataContext"


export function DashboardContainer() {
  const [activeSection, setActiveSection] = useState<DashboardSection>('profile')
  const { data: dashboardData } = useDashboardData()
  
  const handleDataUpdate = (newData: Partial<DashboardData>) => {
    // For now, we'll handle updates via the individual sections
    // In the future, this could update the context or trigger a refresh
    console.log('Dashboard data update:', newData)
  }

  const renderActiveSection = () => {

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