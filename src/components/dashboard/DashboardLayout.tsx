"use client"

import React, { useState } from "react"
import { 
  User, 
  Briefcase, 
  Star, 
  MessageSquare, 
  ExternalLink, 
  CreditCard,
  FileText,
  Settings,
  Home,
  Menu,
  X,
  Activity,
  Crown,
  LogOut,
  HelpCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { DashboardSection } from "@/types/dashboard"
import Image from 'next/image';
import { ImageFallback } from '@/components/ui/ImageFallback';

// Settings Menu Component
function SettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
    setIsOpen(false);
  };

  const goToPublicProfile = () => {
    // Navigate to profile section
    window.location.href = '/dashboard?section=profile';
    setIsOpen(false);
  };

  const openSupport = () => {
    // Open help documentation or support
    window.open('https://docs.example.com', '_blank');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="sm" 
        className="p-2"
        onClick={() => setIsOpen(!isOpen)}
        title="Settings"
      >
        <Settings className="h-4 w-4" />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full right-0 mt-2 w-56 bg-background rounded-lg border shadow-lg z-50 overflow-hidden">
            
            {/* Profile Settings */}
            <button
              onClick={goToPublicProfile}
              className="w-full px-4 py-4 text-left flex items-center gap-3 hover:bg-muted transition-colors"
            >
              <User className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">Profile Settings</span>
            </button>

            {/* Support */}
            <button
              onClick={openSupport}
              className="w-full px-4 py-4 text-left flex items-center gap-3 hover:bg-muted transition-colors"
            >
              <HelpCircle className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">Help & Support</span>
            </button>

            <hr className="border-border my-2" />

            {/* Log Out */}
            <button
              onClick={handleLogout}
              className="w-full px-4 py-4 text-left flex items-center gap-3 hover:bg-red-50 transition-colors text-red-600"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Log Out</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

interface DashboardLayoutProps {
  children: React.ReactNode
  activeSection: DashboardSection
  onSectionChange: (section: DashboardSection) => void
  userInfo?: {
    name?: string
    email?: string
    profileImage?: string
    username?: string
  }
  isPro?: boolean
}

const navigationItems = [
  { id: 'profile' as DashboardSection, label: 'Profile', icon: User, proRequired: false },
  { id: 'analytics' as DashboardSection, label: 'Analytics', icon: Activity, proRequired: false },
  { id: 'about' as DashboardSection, label: 'About/Bio', icon: FileText, proRequired: false },
  { id: 'highlights' as DashboardSection, label: 'Highlights', icon: Star, proRequired: false },
  { id: 'services' as DashboardSection, label: 'Services', icon: Briefcase, proRequired: false },
  { id: 'testimonials' as DashboardSection, label: 'Testimonials', icon: MessageSquare, proRequired: false },
  { id: 'cta' as DashboardSection, label: 'Call to Action', icon: CreditCard, proRequired: false },
  { id: 'social' as DashboardSection, label: 'Social Links', icon: ExternalLink, proRequired: false },
]

export function DashboardLayout({ 
  children, 
  activeSection, 
  onSectionChange, 
  userInfo,
  isPro = false
}: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  


  const handleSectionChange = (section: DashboardSection) => {
    onSectionChange(section)
    // Close sidebar on mobile after selection
    setIsSidebarOpen(false)
  }


  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b h-16 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <Home className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="subtitle-3 font-semibold">Dashboard</h2>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-background border-r transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:block
      `}>
        {/* Desktop Sidebar Header */}
        <div className="hidden lg:flex items-center gap-2 p-6 border-b">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <Home className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="subtitle-3 font-semibold">Dashboard</h2>
            <p className="text-description">Landie</p>
          </div>
        </div>

        {/* Mobile Sidebar Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <Home className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="subtitle-3 font-semibold">Dashboard</h2>
              <p className="text-description">Landie</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarOpen(false)}
            className="p-2"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <TooltipProvider>
            <div className="space-y-1">
              {/* View Landing Page nav item */}
              {userInfo?.username && (
                <a
                  href={`/${userInfo.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors text-primary hover:bg-accent hover:text-accent-foreground`}
                >
                  <ExternalLink className="h-5 w-5" />
                  <span className="flex-1 text-left">View Landing Page</span>
                </a>
              )}
              {/* Main navigation items */}
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = activeSection === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSectionChange(item.id)}
                    className={`
                      flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors
                      ${isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.proRequired && !isPro && (
                      <Crown className="h-4 w-4 text-muted-foreground/50" />
                    )}
                  </button>
                )
              })}
            </div>
          </TooltipProvider>
        </nav>


        {/* User Info */}
        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            {userInfo?.profileImage ? (
              <Image
                src={userInfo.profileImage}
                alt={userInfo?.name || 'Profile'}
                width={40}
                height={40}
                loading="lazy"
                className="rounded-full object-cover"
                sizes="40px"
              />
            ) : (
              <ImageFallback size={40} rounded="full" />
            )}
            <div className="flex-1 min-w-0">
              <p className="label font-medium truncate">
                {userInfo?.name || 'User'}
              </p>
              <p className="caption-sm text-muted-foreground truncate">
                {userInfo?.email || 'user@example.com'}
              </p>
            </div>
            <SettingsMenu />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-16 lg:pt-0">
        <div className="container mx-auto p-4 lg:p-6 max-w-4xl">
          {children}
        </div>
      </main>
    </div>
  )
}