import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest'
import { proUserTestUtils } from '../../utils/pro-user-test'
import type { UserProStatus } from '@/types/dashboard'

// Mock components that might use pro features
const MockProFeatureComponent = ({ userProStatus, featureName }: { 
  userProStatus: UserProStatus | null, 
  featureName: string 
}) => {
  const hasAccess = proUserTestUtils.validateProFeatureAccess(userProStatus, featureName)
  
  return (
    <div data-testid={`pro-feature-${featureName}`}>
      {hasAccess ? (
        <div data-testid="feature-granted">
          <h3>{featureName} (Pro Feature)</h3>
          <p>You have access to this pro feature!</p>
        </div>
      ) : (
        <div data-testid="feature-denied">
          <h3>{featureName} (Pro Only)</h3>
          <p>Upgrade to Pro to access this feature</p>
          <button data-testid="upgrade-button">Upgrade to Pro</button>
        </div>
      )}
    </div>
  )
}

describe('Pro Feature Access Control', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Pro Status Validation', () => {
    test('should grant access to pro users', () => {
      const proStatus = proUserTestUtils.generateMockProStatus(true)
      const hasAccess = proUserTestUtils.validateProFeatureAccess(proStatus, 'AI Assistant')
      
      expect(hasAccess).toBe(true)
    })

    test('should deny access to free users', () => {
      const freeStatus = proUserTestUtils.generateMockProStatus(false)
      const hasAccess = proUserTestUtils.validateProFeatureAccess(freeStatus, 'AI Assistant')
      
      expect(hasAccess).toBe(false)
    })

    test('should deny access when pro status is null', () => {
      const hasAccess = proUserTestUtils.validateProFeatureAccess(null, 'AI Assistant')
      
      expect(hasAccess).toBe(false)
    })

    test('should handle undefined pro status', () => {
      const hasAccess = proUserTestUtils.validateProFeatureAccess(undefined as any, 'AI Assistant')
      
      expect(hasAccess).toBe(false)
    })
  })

  describe('Feature Access Component Behavior', () => {
    test('should show pro feature to pro users', () => {
      const proStatus = proUserTestUtils.generateMockProStatus(true)
      
      render(
        <MockProFeatureComponent 
          userProStatus={proStatus} 
          featureName="Advanced Charts" 
        />
      )

      expect(screen.getByTestId('feature-granted')).toBeInTheDocument()
      expect(screen.getByText('Advanced Charts (Pro Feature)')).toBeInTheDocument()
      expect(screen.getByText('You have access to this pro feature!')).toBeInTheDocument()
      expect(screen.queryByTestId('upgrade-button')).not.toBeInTheDocument()
    })

    test('should show upgrade prompt to free users', () => {
      const freeStatus = proUserTestUtils.generateMockProStatus(false)
      
      render(
        <MockProFeatureComponent 
          userProStatus={freeStatus} 
          featureName="Advanced Charts" 
        />
      )

      expect(screen.getByTestId('feature-denied')).toBeInTheDocument()
      expect(screen.getByText('Advanced Charts (Pro Only)')).toBeInTheDocument()
      expect(screen.getByText('Upgrade to Pro to access this feature')).toBeInTheDocument()
      expect(screen.getByTestId('upgrade-button')).toBeInTheDocument()
    })

    test('should handle missing pro status gracefully', () => {
      render(
        <MockProFeatureComponent 
          userProStatus={null} 
          featureName="AI Insights" 
        />
      )

      expect(screen.getByTestId('feature-denied')).toBeInTheDocument()
      expect(screen.getByText('AI Insights (Pro Only)')).toBeInTheDocument()
      expect(screen.getByTestId('upgrade-button')).toBeInTheDocument()
    })
  })

  describe('Test Scenarios Validation', () => {
    test('should validate free user scenario expectations', () => {
      const scenarios = proUserTestUtils.getTestScenarios()
      const freeUser = scenarios.freeUser
      
      expect(freeUser.name).toBe('Free User')
      expect(freeUser.dashboardData.userProStatus?.is_pro).toBe(false)
      expect(freeUser.expectedFeatures.basicAnalytics).toBe(true)
      expect(freeUser.expectedFeatures.proAnalytics).toBe(false)
      expect(freeUser.expectedFeatures.aiAssistant).toBe(false)
      expect(freeUser.expectedFeatures.advancedCharts).toBe(false)
    })

    test('should validate pro user scenario expectations', () => {
      const scenarios = proUserTestUtils.getTestScenarios()
      const proUser = scenarios.proUser
      
      expect(proUser.name).toBe('Pro User')
      expect(proUser.dashboardData.userProStatus?.is_pro).toBe(true)
      expect(proUser.expectedFeatures.basicAnalytics).toBe(true)
      expect(proUser.expectedFeatures.proAnalytics).toBe(true)
      expect(proUser.expectedFeatures.aiAssistant).toBe(true)
      expect(proUser.expectedFeatures.advancedCharts).toBe(true)
    })

    test('should validate user without pro status scenario', () => {
      const scenarios = proUserTestUtils.getTestScenarios()
      const userWithoutStatus = scenarios.userWithoutProStatus
      
      expect(userWithoutStatus.name).toBe('User Without Pro Status Record')
      expect(userWithoutStatus.dashboardData.userProStatus).toBe(null)
      expect(userWithoutStatus.expectedFeatures.basicAnalytics).toBe(true)
      expect(userWithoutStatus.expectedFeatures.proAnalytics).toBe(false)
      expect(userWithoutStatus.expectedFeatures.aiAssistant).toBe(false)
      expect(userWithoutStatus.expectedFeatures.advancedCharts).toBe(false)
    })
  })

  describe('Multiple Pro Features', () => {
    test('should handle multiple pro features correctly for pro user', () => {
      const proStatus = proUserTestUtils.generateMockProStatus(true)
      const features = ['AI Assistant', 'Advanced Charts', 'Section Analysis', 'Marketing Insights']
      
      features.forEach(feature => {
        const hasAccess = proUserTestUtils.validateProFeatureAccess(proStatus, feature)
        expect(hasAccess).toBe(true)
      })
    })

    test('should handle multiple pro features correctly for free user', () => {
      const freeStatus = proUserTestUtils.generateMockProStatus(false)
      const features = ['AI Assistant', 'Advanced Charts', 'Section Analysis', 'Marketing Insights']
      
      features.forEach(feature => {
        const hasAccess = proUserTestUtils.validateProFeatureAccess(freeStatus, feature)
        expect(hasAccess).toBe(false)
      })
    })

    test('should render multiple pro features with different access levels', () => {
      const proStatus = proUserTestUtils.generateMockProStatus(true)
      const freeStatus = proUserTestUtils.generateMockProStatus(false)
      
      const { rerender } = render(
        <div>
          <MockProFeatureComponent userProStatus={proStatus} featureName="AI-Assistant" />
          <MockProFeatureComponent userProStatus={proStatus} featureName="Charts" />
        </div>
      )

      // Pro user should see both features
      expect(screen.getAllByTestId('feature-granted')).toHaveLength(2)
      expect(screen.queryByTestId('feature-denied')).not.toBeInTheDocument()

      // Rerender with free user
      rerender(
        <div>
          <MockProFeatureComponent userProStatus={freeStatus} featureName="AI-Assistant" />
          <MockProFeatureComponent userProStatus={freeStatus} featureName="Charts" />
        </div>
      )

      // Free user should see upgrade prompts for both
      expect(screen.getAllByTestId('feature-denied')).toHaveLength(2)
      expect(screen.queryByTestId('feature-granted')).not.toBeInTheDocument()
      expect(screen.getAllByTestId('upgrade-button')).toHaveLength(2)
    })
  })

  describe('Pro Status State Changes', () => {
    test('should handle upgrade from free to pro', async () => {
      const initialStatus = proUserTestUtils.generateMockProStatus(false)
      
      const { rerender } = render(
        <MockProFeatureComponent 
          userProStatus={initialStatus} 
          featureName="Premium Analytics" 
        />
      )

      // Initially should show upgrade prompt
      expect(screen.getByTestId('feature-denied')).toBeInTheDocument()
      expect(screen.getByTestId('upgrade-button')).toBeInTheDocument()

      // Simulate upgrade to pro
      const upgradedStatus = await proUserTestUtils.upgradeUserToPro('test-user-id')
      
      rerender(
        <MockProFeatureComponent 
          userProStatus={upgradedStatus} 
          featureName="Premium Analytics" 
        />
      )

      // Should now show the feature
      expect(screen.getByTestId('feature-granted')).toBeInTheDocument()
      expect(screen.queryByTestId('upgrade-button')).not.toBeInTheDocument()
    })

    test('should handle downgrade from pro to free', async () => {
      const initialStatus = proUserTestUtils.generateMockProStatus(true)
      
      const { rerender } = render(
        <MockProFeatureComponent 
          userProStatus={initialStatus} 
          featureName="Premium Analytics" 
        />
      )

      // Initially should show the feature
      expect(screen.getByTestId('feature-granted')).toBeInTheDocument()

      // Simulate downgrade from pro
      const downgradedStatus = await proUserTestUtils.downgradeUserFromPro('test-user-id')
      
      rerender(
        <MockProFeatureComponent 
          userProStatus={downgradedStatus} 
          featureName="Premium Analytics" 
        />
      )

      // Should now show upgrade prompt
      expect(screen.getByTestId('feature-denied')).toBeInTheDocument()
      expect(screen.getByTestId('upgrade-button')).toBeInTheDocument()
    })
  })

  describe('Console Logging Validation', () => {
    test('should log access granted for pro users', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const proStatus = proUserTestUtils.generateMockProStatus(true)
      
      proUserTestUtils.validateProFeatureAccess(proStatus, 'Test Feature')
      
      expect(consoleSpy).toHaveBeenCalledWith(
        "Pro feature 'Test Feature' granted: User has pro access"
      )
      
      consoleSpy.mockRestore()
    })

    test('should log access denied for free users', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const freeStatus = proUserTestUtils.generateMockProStatus(false)
      
      proUserTestUtils.validateProFeatureAccess(freeStatus, 'Test Feature')
      
      expect(consoleSpy).toHaveBeenCalledWith(
        "Pro feature 'Test Feature' denied: User is not pro"
      )
      
      consoleSpy.mockRestore()
    })

    test('should log access denied for null pro status', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      proUserTestUtils.validateProFeatureAccess(null, 'Test Feature')
      
      expect(consoleSpy).toHaveBeenCalledWith(
        "Pro feature 'Test Feature' denied: No pro status found"
      )
      
      consoleSpy.mockRestore()
    })
  })
})