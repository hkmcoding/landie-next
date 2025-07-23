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

  it('maintains consistent outer wrapper for all navigation items', () => {
    // Test that all navigation items are wrapped in <div> regardless of disabled state
    const { container } = render(<DashboardLayout {...defaultProps} isPro={false} />);
    
    // All navigation items should be wrapped in div containers
    const navItems = container.querySelectorAll('nav .space-y-1 > div');
    expect(navItems.length).toBeGreaterThan(0);
    
    // Each nav item should have a div as the direct child
    navItems.forEach((item) => {
      expect(item.tagName).toBe('DIV');
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
    
    // Both should have same outer structure (div wrappers)
    const nonProNavItems = nonProContainer.querySelectorAll('nav .space-y-1 > div');
    const proNavItems = proContainer.querySelectorAll('nav .space-y-1 > div');
    
    expect(nonProNavItems.length).toBe(proNavItems.length);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    
    unmountNonPro();
    unmountPro();
    consoleErrorSpy.mockRestore();
  });

  it('View Landing Page button renders as stable button element', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Test with username (enabled state)
    const { container: withUsername, unmount: unmountWithUsername } = render(
      <DashboardLayout {...defaultProps} username="test-user" />
    );
    
    // Test without username (disabled state)
    const { container: withoutUsername, unmount: unmountWithoutUsername } = render(
      <DashboardLayout {...defaultProps} username="" />
    );
    
    // Both should render as button elements (not div/other elements)
    const enabledButton = withUsername.querySelector('button:not([disabled])');
    const disabledButton = withoutUsername.querySelector('button[disabled]');
    
    expect(enabledButton).toBeTruthy();
    expect(disabledButton).toBeTruthy();
    expect(enabledButton?.tagName).toBe('BUTTON');
    expect(disabledButton?.tagName).toBe('BUTTON');
    
    // No hydration errors
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    
    unmountWithUsername();
    unmountWithoutUsername();
    consoleErrorSpy.mockRestore();
  });
});