"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/DashboardLayout"
import { DashboardSection, DashboardData } from "@/types/dashboard"

// Simple dev section components to avoid chunk loading issues
const DevSection = ({ title, description }: { title: string; description: string }) => (
  <div className="space-y-4">
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
    </div>
    <div className="rounded-lg border p-4">
      <p>This is the {title} section. Functionality can be added here.</p>
    </div>
  </div>
)

// Mock data for dev dashboard testing
const mockDashboardData: DashboardData = {
  landingPage: {
    id: 'dev-test-id',
    user_id: 'dev-user-id',
    name: 'Test User',
    headline: 'Software Developer',
    bio: 'This is a test bio for development purposes.',
    profile_image_url: null,
    contact_email: 'test@example.com',
    phone: null,
    location: null,
    website_url: null,
    linkedin_url: null,
    github_url: null,
    twitter_url: null,
    instagram_url: null,
    youtube_url: null,
    facebook_url: null,
    tiktok_url: null,
    custom_domain: null,
    cta_title: 'Get In Touch',
    cta_subtitle: 'Ready to work together?',
    cta_button_text: 'Contact Me',
    cta_button_url: 'mailto:test@example.com',
    background_color: '#ffffff',
    text_color: '#000000',
    accent_color: '#007bff',
    font_family: 'Inter',
    layout_style: 'modern',
    show_analytics: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  services: [
    {
      id: 'service-1',
      landing_page_id: 'dev-test-id',
      title: 'Web Development',
      description: 'Full-stack web application development',
      price: '$2000',
      button_text: 'Get Started',
      button_url: '#contact',
      display_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  highlights: [
    {
      id: 'highlight-1',
      landing_page_id: 'dev-test-id',
      title: '5+ Years Experience',
      description: 'Professional software development experience',
      icon: 'star',
      display_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  testimonials: [
    {
      id: 'testimonial-1',
      landing_page_id: 'dev-test-id',
      client_name: 'John Doe',
      client_company: 'Example Corp',
      content: 'Excellent work and professional service!',
      rating: 5,
      display_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
}

export default function DevDashboard() {
  const [activeSection, setActiveSection] = useState<DashboardSection>('profile')
  const [dashboardData, setDashboardData] = useState<DashboardData>(mockDashboardData)

  const handleDataUpdate = (newData: Partial<DashboardData>) => {
    setDashboardData(prev => ({ ...prev, ...newData }))
  }

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Profile Setup</h1>
              <p className="text-muted-foreground">Configure your profile information and upload your photo</p>
            </div>
            <div className="rounded-lg border p-4">
              <p>Profile editing functionality would go here. This is the dev dashboard version.</p>
            </div>
          </div>
        )
      case 'analytics':
        return <DevSection title="Analytics" description="View your page analytics and insights" />
      case 'services':
        return <DevSection title="Services" description="Manage your service offerings" />
      case 'highlights':
        return <DevSection title="Highlights" description="Showcase your key achievements" />
      case 'testimonials':
        return <DevSection title="Testimonials" description="Display client testimonials" />
      case 'social':
        return <DevSection title="Social Links" description="Manage your social media links" />
      case 'cta':
        return <DevSection title="Call to Action" description="Configure your call-to-action section" />
      case 'about':
        return <DevSection title="About" description="Edit your bio and about information" />
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