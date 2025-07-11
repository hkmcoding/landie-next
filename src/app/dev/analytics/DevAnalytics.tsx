'use client';

import { useState, useEffect } from "react"
import { AnalyticsSection } from "@/components/dashboard/sections/AnalyticsSection"
import { DashboardData } from "@/types/dashboard"
import { DashboardServiceClient } from "@/lib/supabase/dashboard-service-client"
import { createClient } from "@/lib/supabase/client"

export default function DevAnalytics() {
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
        
        // Force pro status to true for dev purposes
        const devData = {
          ...data,
          userProStatus: {
            ...data.userProStatus,
            is_pro: true
          }
        }
        
        setDashboardData(devData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-description">Loading dev analytics...</p>
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

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-description">No dashboard data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
            <span className="w-2 h-2 bg-primary rounded-full"></span>
            DEV MODE - Pro Features Enabled
          </div>
          <h1 className="text-3xl font-bold">Analytics Development</h1>
          <p className="text-muted-foreground">Develop and test pro analytics features</p>
        </div>
        
        <AnalyticsSection 
          dashboardData={dashboardData}
          userId={dashboardData.landingPage?.user_id || ''}
        />
      </div>
    </div>
  )
}