import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    pathname: '/dashboard',
  }),
}));

// Mock useProStatus hook
vi.mock('@/hooks/useProStatus', () => ({
  useProStatus: () => ({
    plan: 'free',
    expiresAt: null,
    isTrialActive: false,
    trialEndsAt: null,
  }),
}));

// Mock shadcn/ui components
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <div data-testid="tooltip">{children}</div>,
  TooltipContent: ({ children }: any) => <div data-testid="tooltip-content">{children}</div>,
  TooltipProvider: ({ children }: any) => <div data-testid="tooltip-provider">{children}</div>,
  TooltipTrigger: ({ children, asChild }: any) => asChild ? children : <div data-testid="tooltip-trigger">{children}</div>,
}));

describe('DashboardLayout Navigation Hydration Safety', () => {
  const defaultProps = {
    activeSection: 'profile' as const,
    onSectionChange: vi.fn(),
    authEmail: 'auth@user.com',
    userInfo: {
      name: 'Test User',
      email: 'test@example.com',
    },
    username: 'testuser',
    children: <div>Test Content</div>,
  };

  it('renders navigation without hydration errors', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Test with consistent isPro value (this is key - same value on server/client)
    const { rerender } = render(<DashboardLayout {...defaultProps} isPro={false} />);
    
    // Re-render with same props to simulate hydration
    rerender(<DashboardLayout {...defaultProps} isPro={false} />);
    
    // Test with pro enabled
    rerender(<DashboardLayout {...defaultProps} isPro={true} />);
    rerender(<DashboardLayout {...defaultProps} isPro={true} />);
    
    // Should never see hydration failed errors
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Hydration failed')
    );
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Server:')
    );
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Client:')
    );
    
    consoleErrorSpy.mockRestore();
  });

  it('maintains consistent navigation item structure', () => {
    // Test that navigation items are rendered consistently
    const { container } = render(<DashboardLayout {...defaultProps} isPro={false} />);
    
    // Navigation items should be buttons and/or anchor elements
    const navButtons = container.querySelectorAll('nav .space-y-1 > button');
    const navAnchors = container.querySelectorAll('nav .space-y-1 > a');
    const totalNavItems = navButtons.length + navAnchors.length;
    
    expect(totalNavItems).toBeGreaterThan(0);
    
    // Each nav button should be a BUTTON element
    navButtons.forEach((item) => {
      expect(item.tagName).toBe('BUTTON');
    });
    
    // Each nav anchor should be an A element
    navAnchors.forEach((item) => {
      expect(item.tagName).toBe('A');
    });
  });

  it('renders consistently between pro and non-pro states', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Render non-pro version
    const { container: nonProContainer, unmount: unmountNonPro } = render(
      <DashboardLayout {...defaultProps} isPro={false} />
    );
    
    // Render pro version
    const { container: proContainer, unmount: unmountPro } = render(
      <DashboardLayout {...defaultProps} isPro={true} />
    );
    
    // Both should have same number of navigation items
    const nonProNavItems = nonProContainer.querySelectorAll('nav .space-y-1 > button, nav .space-y-1 > a');
    const proNavItems = proContainer.querySelectorAll('nav .space-y-1 > button, nav .space-y-1 > a');
    
    expect(nonProNavItems.length).toBe(proNavItems.length);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    
    unmountNonPro();
    unmountPro();
    consoleErrorSpy.mockRestore();
  });

  it('View Landing Page link renders conditionally based on username', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Test with username (shows link)
    const { container: withUsername, unmount: unmountWithUsername } = render(
      <DashboardLayout {...defaultProps} userInfo={{ ...defaultProps.userInfo, username: "test-user" }} />
    );
    
    // Test without username (no link)
    const { container: withoutUsername, unmount: unmountWithUnset } = render(
      <DashboardLayout {...defaultProps} userInfo={{ ...defaultProps.userInfo, username: undefined }} />
    );
    
    // With username should render the landing page link
    const enabledLink = withUsername.querySelector('a[href="/test-user"]');
    expect(enabledLink).toBeTruthy();
    expect(enabledLink?.tagName).toBe('A');
    
    // Without username should not render the landing page link
    const disabledLink = withoutUsername.querySelector('a[href="/test-user"]');
    expect(disabledLink).toBeFalsy();
    
    // No hydration errors
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    
    unmountWithUsername();
    unmountWithUnset();
    consoleErrorSpy.mockRestore();
  });

  it('shows auth email in sidebar', () => {
    const { getByText, queryByText } = render(
      <DashboardLayout
        {...defaultProps}
        authEmail="real@user.com"
        userInfo={{ name: 'Jane Coach', email: 'contact@different.com' }}
      />
    );
    
    expect(getByText('real@user.com')).toBeInTheDocument();
    expect(queryByText('contact@different.com')).not.toBeInTheDocument();
    expect(queryByText('user@example.com')).not.toBeInTheDocument();
  });
});