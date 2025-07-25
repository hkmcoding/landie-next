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
import { DashboardDataProvider, useDashboardData } from '@/contexts/DashboardDataContext'

interface DashboardProps {
  initialData: DashboardData
  authEmail: string
}

function DashboardContent({ authEmail }: { authEmail: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeSection = (searchParams.get('section') as DashboardSection) || 'profile'
  const { data, updateData } = useDashboardData()
  
  console.log('🔍 DEBUG Dashboard: authEmail received:', authEmail);
  
  // Client-side guard: redirect if no landing page data
  React.useEffect(() => {
    if (!data?.landingPage) {
      router.replace('/onboarding');
    }
  }, [data?.landingPage, router]);
  
  // Show loading skeleton while redirecting
  if (!data?.landingPage) {
    return <div className="p-6">Redirecting to onboarding...</div>;
  }

  const handleSectionChange = (section: DashboardSection) => {
    const params = new URLSearchParams(searchParams)
    params.set('section', section)
    router.push(`${pathname}?${params.toString()}`)
  }

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'profile':
        return <ProfileSection landingPage={data.landingPage} onUpdate={updateData} />
      case 'analytics':
        return <AnalyticsSection dashboardData={data} userId={data.landingPage?.user_id || ''} />
      case 'services':
        return <ServicesSection services={data.services} landingPageId={data.landingPage?.id} onUpdate={updateData} />
      case 'highlights':
        return <HighlightsSection highlights={data.highlights} landingPageId={data.landingPage?.id} onUpdate={updateData} />
      case 'testimonials':
        return <TestimonialsSection testimonials={data.testimonials} landingPageId={data.landingPage?.id} onUpdate={updateData} />
      case 'social':
        return <SocialLinksSection landingPage={data.landingPage} onUpdate={updateData} />
      case 'cta':
        return <CallToActionSection landingPage={data.landingPage} onUpdate={updateData} />
      case 'about':
        return <AboutSection landingPage={data.landingPage} onUpdate={updateData} />
      default:
        return null
    }
  }

  const isPro = Boolean(data?.userProStatus?.is_pro);

  return (
    <DashboardLayout
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
      authEmail={authEmail}
      userInfo={{
        name: data?.landingPage?.name ?? undefined,
        email: data?.landingPage?.contact_email ?? undefined,
        profileImage: data?.landingPage?.profile_image_url ?? undefined,
        username: data?.landingPage?.username ?? undefined,
      }}
      isPro={isPro}
    >
      {renderActiveSection()}
    </DashboardLayout>
  )
}

export default function Dashboard({ initialData, authEmail }: DashboardProps) {
  return (
    <DashboardDataProvider initialData={initialData}>
      <DashboardContent authEmail={authEmail} />
    </DashboardDataProvider>
  )
} 