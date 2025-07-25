"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { analyticsService } from "@/lib/supabase/analytics-service"
import { AIAssistantDashboard } from "@/components/dashboard/AIAssistantDashboard"
import type { AnalyticsData, DashboardData } from "@/types/dashboard"
import { Activity, Users, MousePointer, Clock, TrendingUp, Target, Zap } from "lucide-react"

interface AnalyticsSectionProps {
  dashboardData: DashboardData
  userId: string
}

export function AnalyticsSection({ dashboardData, userId }: AnalyticsSectionProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const landingPageId = dashboardData.landingPage?.id
  const isPro = dashboardData.userProStatus?.is_pro || false

  useEffect(() => {
    async function fetchAnalytics() {
      if (!landingPageId) {
        setLoading(false)
        return
      }

      try {
        const data = await analyticsService.getAnalyticsData(userId, landingPageId, isPro)
        setAnalyticsData(data)
      } catch (error) {
        console.error('Error fetching analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [userId, landingPageId, isPro])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="heading-2">Analytics</h1>
          <p className="text-description">Track your landing page performance</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent>
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!landingPageId || !analyticsData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="heading-2">Analytics</h1>
          <p className="text-description">Track your landing page performance</p>
        </div>
        <Card>
          <CardContent className="text-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="heading-5 mb-2">No Analytics Data</h3>
            <p className="text-description">
              {!landingPageId 
                ? "Create a landing page to start tracking analytics" 
                : "Analytics data will appear here once visitors interact with your landing page"
              }
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="heading-2">Analytics</h1>
        <p className="text-description">Track your landing page performance</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="marketing" disabled={!isPro}>
            <span className="hidden sm:inline">AI Marketing Assistant</span>
            <span className="sm:hidden">AI Assistant</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab analyticsData={analyticsData} isPro={isPro} />
        </TabsContent>

        <TabsContent value="marketing" className="space-y-6">
          <MarketingAssistantTab analyticsData={analyticsData} dashboardData={dashboardData} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function OverviewTab({ analyticsData, isPro }: { analyticsData: AnalyticsData; isPro: boolean }) {
  // Use database aggregated counts for consistency with pro analytics
  const totalCtaClicks = analyticsData.totalCtaClicks ?? analyticsData.ctaClicks.length
  const totalUniqueVisitors = analyticsData.totalUniqueVisitors ?? analyticsData.uniqueVisits.length
  const totalPageViews = analyticsData.totalPageViews ?? analyticsData.pageViews.length
  const avgSessionDuration = analyticsData.averagePageSession?.avg_session_duration || 0

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium leading-tight min-h-[2.5rem] flex items-center">CTA Clicks</CardTitle>
              <MousePointer className="h-5 w-5 text-primary flex-shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-2xl font-bold">{totalCtaClicks}</div>
            <p className="text-sm text-muted-foreground">Total clicks on your call-to-action</p>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium leading-tight min-h-[2.5rem] flex items-center">Unique Visitors</CardTitle>
              <Users className="h-5 w-5 text-primary flex-shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-2xl font-bold">{totalUniqueVisitors}</div>
            <p className="text-sm text-muted-foreground">Individual visitors to your page</p>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium leading-tight min-h-[2.5rem] flex items-center">Page Views</CardTitle>
              <Activity className="h-5 w-5 text-primary flex-shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-2xl font-bold">{totalPageViews}</div>
            <p className="text-sm text-muted-foreground">Total views of your landing page</p>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium leading-tight min-h-[2.5rem] flex items-center">Avg. Session</CardTitle>
              <Clock className="h-5 w-5 text-primary flex-shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-2xl font-bold">{formatDuration(avgSessionDuration)}</div>
            <p className="text-sm text-muted-foreground">Average time spent on page</p>
          </CardContent>
        </Card>
      </div>

      {!isPro && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Unlock Pro Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-description mb-4">
              Get access to advanced analytics including charts, section analysis, and AI-powered insights.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Views and clicks over time charts
              </li>
              <li className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Section drop-off analysis
              </li>
              <li className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="hidden sm:inline">AI Marketing Assistant</span>
                <span className="sm:hidden">AI Assistant</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function MarketingAssistantTab({ analyticsData, dashboardData }: { analyticsData: AnalyticsData; dashboardData: DashboardData }) {
  const landingPageId = dashboardData.landingPage?.id;
  const userName = dashboardData.landingPage?.name || 'User';

  if (!landingPageId) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <span className="hidden sm:inline">AI Marketing Assistant</span>
              <span className="sm:hidden">AI Assistant</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="heading-5 mb-2">Landing Page Required</h3>
              <p className="text-description">
                Create a landing page to access AI-powered marketing insights and recommendations.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AIAssistantDashboard 
      landingPageId={landingPageId}
      userName={userName}
    />
  );
}

function ViewsChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No chart data available yet
      </div>
    )
  }

  const maxViews = Math.max(...data.map(d => d.total_views || 0))

  return (
    <div className="space-y-2">
      {data.slice(-24).map((item, index) => {
        const height = maxViews > 0 ? (item.total_views / maxViews) * 100 : 0
        const date = new Date(item.hour_bucket)
        
        return (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="w-16 text-muted-foreground text-xs">
              {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="flex-1 bg-muted rounded-full h-2 relative">
              <div 
                className="bg-primary rounded-full h-2 transition-all duration-300"
                style={{ width: `${height}%` }}
              />
            </div>
            <div className="w-8 text-right">{item.total_views}</div>
          </div>
        )
      })}
    </div>
  )
}

function SectionAnalysis({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No section data available yet
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((section, index) => (
        <Card key={index} className="h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium leading-tight min-h-[2.5rem] flex items-center capitalize">
                {section.section_slug.replace('_', ' ')}
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-primary flex-shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-2xl font-bold">{Math.round(section.dropoff_rate * 100)}%</div>
            <p className="text-sm text-muted-foreground">
              {section.views} views • {section.dropoffs} drop-offs
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export { SectionAnalysis };