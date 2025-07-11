"use client"

import { usePathname } from 'next/navigation'
import { Nav } from "@/components/marketing/Nav"
import { Footer } from "@/components/marketing/Footer"

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  
  // Check if current path is a dashboard route
  const isDashboard = pathname?.startsWith('/dashboard')
  
  // Check if it's a user profile page (should match /[username] pattern)
  // Exclude specific routes like /, /login, /register, /onboarding, /dev
  const isStaticRoute = pathname === '/' || 
                       pathname?.startsWith('/login') || 
                       pathname?.startsWith('/register') || 
                       pathname?.startsWith('/onboarding') || 
                       pathname?.startsWith('/dev')
  
  const isUserProfile = pathname && !isDashboard && !isStaticRoute
  
  if (isDashboard || isUserProfile) {
    // Dashboard pages and user profile pages: no marketing nav/footer
    return <>{children}</>
  }
  
  // Marketing pages: show nav and footer
  return (
    <>
      <Nav />
      {children}
      <Footer />
    </>
  )
}