import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest'
import { AnalyticsSection } from '@/components/dashboard/sections/AnalyticsSection'
import { proUserTestUtils } from '../../utils/pro-user-test'
import { analyticsService } from '@/lib/supabase/analytics-service'

// Mock the analytics service
vi.mock('@/lib/supabase/analytics-service', () => ({
  analyticsService: {
    getAnalyticsData: vi.fn()
  }
}))

// Mock the AI Assistant Dashboard component
vi.mock('@/components/dashboard/AIAssistantDashboard', () => ({
  AIAssistantDashboard: ({ landingPageId, userName }: any) => (
    <div data-testid="ai-assistant-dashboard">
      <h3>AI Assistant Dashboard</h3>
      <p>Landing Page: {landingPageId}</p>
      <p>User: {userName}</p>
    </div>
  )
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null
      })
    }
  })
}))

// Mock UI components that might cause issues
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => children,
  Tooltip: ({ children }: any) => children,
  TooltipTrigger: ({ children, asChild }: any) => asChild ? children : <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div data-testid="tooltip-content">{children}</div>
}))

describe('Analytics Pro Gating', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Free User Analytics Access', () => {
    test('should show basic analytics for free users', async () => {
      const props = proUserTestUtils.createAnalyticsSectionProps(false)
      const analyticsData = proUserTestUtils.generateMockAnalyticsData(false)
      
      vi.mocked(analyticsService.getAnalyticsData).mockResolvedValue(analyticsData)

      render(<AnalyticsSection {...props} />)

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Analytics')).toBeInTheDocument()
      })

      // Should show basic metrics
      expect(screen.getByText('CTA Clicks')).toBeInTheDocument()
      expect(screen.getByText('Unique Visitors')).toBeInTheDocument()
      expect(screen.getByText('Page Views')).toBeInTheDocument()
      expect(screen.getByText('Avg. Session')).toBeInTheDocument()

      // Should show correct values from mock data
      const ctaCard = screen.getByText('CTA Clicks').closest('[data-slot="card"]')
      expect(ctaCard).toContainHTML('1') // CTA clicks count
    })

    test('should hide pro features from free users', async () => {
      const props = proUserTestUtils.createAnalyticsSectionProps(false)
      const analyticsData = proUserTestUtils.generateMockAnalyticsData(false)
      
      vi.mocked(analyticsService.getAnalyticsData).mockResolvedValue(analyticsData)

      render(<AnalyticsSection {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Analytics')).toBeInTheDocument()
      })

      // Should NOT show pro analytics section
      expect(screen.queryByText('Pro Analytics')).not.toBeInTheDocument()
      expect(screen.queryByText('Views Over Time')).not.toBeInTheDocument()
      expect(screen.queryByText('Section Analysis')).not.toBeInTheDocument()

      // Should show upgrade promotion
      expect(screen.getByText('Unlock Pro Analytics')).toBeInTheDocument()
      expect(screen.getByText('Get access to advanced analytics including charts, section analysis, and AI-powered insights.')).toBeInTheDocument()
    })

    test('should show disabled AI Marketing Assistant tab for free users', async () => {
      const props = proUserTestUtils.createAnalyticsSectionProps(false)
      const analyticsData = proUserTestUtils.generateMockAnalyticsData(false)
      
      vi.mocked(analyticsService.getAnalyticsData).mockResolvedValue(analyticsData)

      render(<AnalyticsSection {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Analytics')).toBeInTheDocument()
      })

      // Should show disabled AI Assistant tab with crown icon (select the disabled tab, not the upgrade card)
      const aiAssistantTab = screen.getByRole('tablist').querySelector('.cursor-not-allowed.opacity-50')
      expect(aiAssistantTab).toBeInTheDocument()
      expect(aiAssistantTab).toHaveClass('cursor-not-allowed')
      expect(aiAssistantTab).toHaveClass('opacity-50')

      // Should show crown icon (using SVG element)
      const crownIcon = aiAssistantTab?.querySelector('svg')
      expect(crownIcon).toBeInTheDocument()
    })

    test('should show upgrade prompt when trying to access AI Assistant as free user', async () => {
      const props = proUserTestUtils.createAnalyticsSectionProps(false)
      const analyticsData = proUserTestUtils.generateMockAnalyticsData(false)
      
      vi.mocked(analyticsService.getAnalyticsData).mockResolvedValue(analyticsData)

      render(<AnalyticsSection {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Analytics')).toBeInTheDocument()
      })

      // Try to click the disabled AI Assistant tab (should not work)
      const disabledTab = screen.getByRole('tablist').querySelector('.cursor-not-allowed.opacity-50')
      
      if (disabledTab) {
        // The tab should be disabled and not clickable
        expect(disabledTab).toHaveClass('cursor-not-allowed')
        
        // Should show tooltip on hover
        const tooltip = screen.getByText('Upgrade to Pro to access AI Marketing Assistant')
        expect(tooltip).toBeInTheDocument()
      }
    })
  })

  describe('Pro User Analytics Access', () => {
    test('should show full analytics suite for pro users', async () => {
      const props = proUserTestUtils.createAnalyticsSectionProps(true)
      const analyticsData = proUserTestUtils.generateMockAnalyticsData(true)
      
      vi.mocked(analyticsService.getAnalyticsData).mockResolvedValue(analyticsData)

      render(<AnalyticsSection {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Analytics')).toBeInTheDocument()
      })

      // Should show basic metrics
      expect(screen.getByText('CTA Clicks')).toBeInTheDocument()
      expect(screen.getByText('Unique Visitors')).toBeInTheDocument()
      expect(screen.getByText('Page Views')).toBeInTheDocument()

      // Should show pro analytics features
      expect(screen.getByText('Pro Analytics')).toBeInTheDocument()
      expect(screen.getByText('Views Over Time')).toBeInTheDocument()
      expect(screen.getByText('Section Analysis')).toBeInTheDocument()
    })

    test('should show enabled AI Marketing Assistant tab for pro users', async () => {
      const props = proUserTestUtils.createAnalyticsSectionProps(true)
      const analyticsData = proUserTestUtils.generateMockAnalyticsData(true)
      
      vi.mocked(analyticsService.getAnalyticsData).mockResolvedValue(analyticsData)

      render(<AnalyticsSection {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Analytics')).toBeInTheDocument()
      })

      // Should show enabled AI Assistant tab
      const aiAssistantTab = screen.getByRole('tab', { name: 'AI Marketing Assistant' })
      expect(aiAssistantTab).toBeInTheDocument()
      expect(aiAssistantTab).not.toHaveClass('cursor-not-allowed')
      expect(aiAssistantTab).not.toHaveClass('opacity-50')
    })

    test('should load AI Assistant Dashboard when tab is clicked by pro users', async () => {
      const props = proUserTestUtils.createAnalyticsSectionProps(true)
      const analyticsData = proUserTestUtils.generateMockAnalyticsData(true)
      
      vi.mocked(analyticsService.getAnalyticsData).mockResolvedValue(analyticsData)

      render(<AnalyticsSection {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Analytics')).toBeInTheDocument()
      })

      // Click on AI Marketing Assistant tab
      const aiAssistantTab = screen.getByRole('tab', { name: 'AI Marketing Assistant' })
      await user.click(aiAssistantTab)

      // Should show AI Assistant Dashboard
      await waitFor(() => {
        expect(screen.getByTestId('ai-assistant-dashboard')).toBeInTheDocument()
        expect(screen.getByText('AI Assistant Dashboard')).toBeInTheDocument()
        expect(screen.getByText('Landing Page: test-landing-page-id')).toBeInTheDocument()
        expect(screen.getByText('User: Test User')).toBeInTheDocument()
      })
    })

    test('should NOT show upgrade prompts for pro users', async () => {
      const props = proUserTestUtils.createAnalyticsSectionProps(true)
      const analyticsData = proUserTestUtils.generateMockAnalyticsData(true)
      
      vi.mocked(analyticsService.getAnalyticsData).mockResolvedValue(analyticsData)

      render(<AnalyticsSection {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Analytics')).toBeInTheDocument()
      })

      // Should NOT show upgrade prompts
      expect(screen.queryByText('Unlock Pro Analytics')).not.toBeInTheDocument()
      expect(screen.queryByText('Upgrade to Pro')).not.toBeInTheDocument()
    })
  })

  describe('Analytics Service Integration', () => {
    test('should call analytics service with correct pro status', async () => {
      const props = proUserTestUtils.createAnalyticsSectionProps(true)
      const analyticsData = proUserTestUtils.generateMockAnalyticsData(true)
      
      vi.mocked(analyticsService.getAnalyticsData).mockResolvedValue(analyticsData)

      render(<AnalyticsSection {...props} />)

      await waitFor(() => {
        expect(analyticsService.getAnalyticsData).toHaveBeenCalledWith(
          'test-user-id',
          'test-landing-page-id',
          true // isPro should be true
        )
      })
    })

    test('should call analytics service with free user status', async () => {
      const props = proUserTestUtils.createAnalyticsSectionProps(false)
      const analyticsData = proUserTestUtils.generateMockAnalyticsData(false)
      
      vi.mocked(analyticsService.getAnalyticsData).mockResolvedValue(analyticsData)

      render(<AnalyticsSection {...props} />)

      await waitFor(() => {
        expect(analyticsService.getAnalyticsData).toHaveBeenCalledWith(
          'test-user-id',
          'test-landing-page-id',
          false // isPro should be false
        )
      })
    })

    test('should handle analytics service errors gracefully', async () => {
      const props = proUserTestUtils.createAnalyticsSectionProps(true)
      
      vi.mocked(analyticsService.getAnalyticsData).mockRejectedValue(new Error('Analytics service error'))

      render(<AnalyticsSection {...props} />)

      // Should eventually show no data state instead of crashing
      await waitFor(() => {
        expect(screen.getByText('Analytics')).toBeInTheDocument()
      })

      // Should show empty state
      expect(screen.getByText('No Analytics Data')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    test('should handle user without pro status record', async () => {
      const scenario = proUserTestUtils.getTestScenarios().userWithoutProStatus
      const props = {
        dashboardData: scenario.dashboardData,
        userId: 'test-user-id'
      }
      const analyticsData = proUserTestUtils.generateMockAnalyticsData(false)
      
      vi.mocked(analyticsService.getAnalyticsData).mockResolvedValue(analyticsData)

      render(<AnalyticsSection {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Analytics')).toBeInTheDocument()
      })

      // Should treat as free user when pro status is null
      expect(screen.getByText('Unlock Pro Analytics')).toBeInTheDocument()
      expect(screen.queryByText('Pro Analytics')).not.toBeInTheDocument()
    })

    test('should handle missing landing page gracefully', async () => {
      const props = proUserTestUtils.createAnalyticsSectionProps(true)
      props.dashboardData.landingPage = null

      render(<AnalyticsSection {...props} />)

      await waitFor(() => {
        expect(screen.getByText('Analytics')).toBeInTheDocument()
      })

      // Should show no data state
      expect(screen.getByText('No Analytics Data')).toBeInTheDocument()
      expect(screen.getByText('Create a landing page to start tracking analytics')).toBeInTheDocument()
    })

    test('should show loading state initially', () => {
      const props = proUserTestUtils.createAnalyticsSectionProps(true)
      
      // Don't resolve the mock immediately
      vi.mocked(analyticsService.getAnalyticsData).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      )

      render(<AnalyticsSection {...props} />)

      // Should show loading skeleton
      expect(screen.getByText('Analytics')).toBeInTheDocument()
      expect(screen.getByText('Track your landing page performance')).toBeInTheDocument()
      
      // Should show loading cards
      const loadingCards = screen.getAllByRole('generic').filter(el => 
        el.classList.contains('animate-pulse')
      )
      expect(loadingCards.length).toBeGreaterThan(0)
    })
  })
})