'use client'

import React from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { ProfileSection } from '@/components/dashboard/sections/ProfileSection'
import { AboutSection } from '@/components/dashboard/sections/AboutSection'
import { SocialLinksSection } from '@/components/dashboard/sections/SocialLinksSection'
import { CallToActionSection } from '@/components/dashboard/sections/CallToActionSection'
import { ServicesSection } from '@/components/dashboard/sections/ServicesSection'
import { HighlightsSection } from '@/components/dashboard/sections/HighlightsSection'
import { TestimonialsSection } from '@/components/dashboard/sections/TestimonialsSection'
import { AnalyticsSection } from '@/components/dashboard/sections/AnalyticsSection'
import { DashboardSection, DashboardData } from '@/types/dashboard'
import { DashboardDataProvider } from '@/contexts/DashboardDataContext'

interface DashboardProps {
  initialData: DashboardData
}

export default function Dashboard({ initialData }: DashboardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeSection = (searchParams.get('section') as DashboardSection) || 'profile'
  
  const handleDataUpdate = (newData: Partial<DashboardData>) => {
    // This is where you'll handle data updates in the future.
    // For now, we'll just log the update.
    console.log('Dashboard data update:', newData)
  }

  const handleSectionChange = (section: DashboardSection) => {
    const params = new URLSearchParams(searchParams)
    params.set('section', section)
    router.push(`${pathname}?${params.toString()}`)
  }

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'profile':
        return <ProfileSection landingPage={initialData.landingPage} onUpdate={handleDataUpdate} />
      case 'analytics':
        return <AnalyticsSection dashboardData={initialData} userId={initialData.landingPage?.user_id || ''} />
      case 'services':
        return <ServicesSection services={initialData.services} landingPageId={initialData.landingPage?.id} onUpdate={handleDataUpdate} />
      case 'highlights':
        return <HighlightsSection highlights={initialData.highlights} landingPageId={initialData.landingPage?.id} onUpdate={handleDataUpdate} />
      case 'testimonials':
        return <TestimonialsSection testimonials={initialData.testimonials} landingPageId={initialData.landingPage?.id} onUpdate={handleDataUpdate} />
      case 'social':
        return <SocialLinksSection landingPage={initialData.landingPage} onUpdate={handleDataUpdate} />
      case 'cta':
        return <CallToActionSection landingPage={initialData.landingPage} onUpdate={handleDataUpdate} />
      case 'about':
        return <AboutSection landingPage={initialData.landingPage} onUpdate={handleDataUpdate} />
      default:
        return null
    }
  }

  const isPro = Boolean(initialData?.userProStatus?.is_pro);

  return (
    <DashboardDataProvider initialData={initialData}>
      <DashboardLayout
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        userInfo={{
          name: initialData?.landingPage?.name ?? undefined,
          email: initialData?.landingPage?.contact_email ?? undefined,
          profileImage: initialData?.landingPage?.profile_image_url ?? undefined,
          username: initialData?.landingPage?.username ?? undefined,
        }}
        isPro={isPro}
      >
        {renderActiveSection()}
      </DashboardLayout>
    </DashboardDataProvider>
  )
} 