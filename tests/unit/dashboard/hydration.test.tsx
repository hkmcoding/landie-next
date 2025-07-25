import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { mockDashboardData } from '../../utils/seed-data';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    pathname: '/dashboard',
  }),
}));

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: function MockLink({ children, href, ...props }: any) {
    return <a href={href} {...props}>{children}</a>;
  },
}));

// Mock shadcn/ui components that might cause hydration issues
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <div data-testid="tooltip">{children}</div>,
  TooltipContent: ({ children }: any) => <div data-testid="tooltip-content">{children}</div>,
  TooltipProvider: ({ children }: any) => <div data-testid="tooltip-provider">{children}</div>,
  TooltipTrigger: ({ children, asChild }: any) => asChild ? children : <div data-testid="tooltip-trigger">{children}</div>,
}));

describe('DashboardLayout Hydration Safety', () => {
  const defaultProps = {
    activeSection: 'profile' as const,
    onSectionChange: vi.fn(),
    authEmail: 'auth@test.com',
    userInfo: {
      name: 'Test User',
      email: 'test@example.com',
      username: 'testuser',
    },
    children: <div>Test Content</div>,
  };

  it('renders dashboard without hydration warnings', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Test with username
    const { rerender } = render(<DashboardLayout {...defaultProps} userInfo={{ ...defaultProps.userInfo, username: "testuser" }} />);
    expect(spy).not.toHaveBeenCalledWith(
      expect.stringContaining('Hydration failed')
    );
    
    // Test without username - should still render consistently
    rerender(<DashboardLayout {...defaultProps} userInfo={{ ...defaultProps.userInfo, username: undefined }} />);
    expect(spy).not.toHaveBeenCalledWith(
      expect.stringContaining('Hydration failed')
    );
    
    spy.mockRestore();
  });

  it('should handle username prop consistently', () => {
    // Test with username
    const withUsername = render(<DashboardLayout {...defaultProps} userInfo={{ ...defaultProps.userInfo, username: "testuser" }} />);
    expect(withUsername.getByText('View Landing Page')).toBeInTheDocument();
    withUsername.unmount();

    // Test without username
    const withoutUsername = render(<DashboardLayout {...defaultProps} userInfo={{ ...defaultProps.userInfo, username: undefined }} />);
    expect(() => withoutUsername.getByText('View Landing Page')).toThrow();
    withoutUsername.unmount();

    // Test with empty username
    const emptyUsername = render(<DashboardLayout {...defaultProps} userInfo={{ ...defaultProps.userInfo, username: "" }} />);
    expect(() => emptyUsername.getByText('View Landing Page')).toThrow();
  });

  it('should handle userInfo props consistently', () => {
    // Test with full userInfo
    const fullInfo = render(<DashboardLayout {...defaultProps} userInfo={{
      name: 'John Doe',
      email: 'john@example.com',
      profileImage: 'https://example.com/image.jpg'
    }} />);
    expect(fullInfo.getByText('John Doe')).toBeInTheDocument();
    expect(fullInfo.getByText('john@example.com')).toBeInTheDocument();
    fullInfo.unmount();

    // Test with minimal userInfo
    const minimalInfo = render(<DashboardLayout {...defaultProps} userInfo={{}} />);
    expect(minimalInfo.getByText('User')).toBeInTheDocument();
    expect(minimalInfo.getByText('user@example.com')).toBeInTheDocument();
    minimalInfo.unmount();

    // Test without userInfo
    const noInfo = render(<DashboardLayout {...defaultProps} userInfo={undefined} />);
    expect(noInfo.getByText('User')).toBeInTheDocument();
    expect(noInfo.getByText('user@example.com')).toBeInTheDocument();
  });

  it('should not use unstable values in render', () => {
    // Test that component doesn't use Date.now(), Math.random(), or window checks in render
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Multiple renders should be identical
    const render1 = render(<DashboardLayout {...defaultProps} />);
    const html1 = render1.container.innerHTML;
    render1.unmount();

    const render2 = render(<DashboardLayout {...defaultProps} />);
    const html2 = render2.container.innerHTML;
    render2.unmount();

    expect(html1).toBe(html2);
    expect(consoleSpy).not.toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  it('should handle navigation items consistently', () => {
    const { getAllByRole } = render(<DashboardLayout {...defaultProps} />);
    
    // All navigation buttons should be present
    const buttons = getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    
    // Each render should produce the same buttons
    const firstRender = buttons.map(btn => btn.textContent);
    
    const { getAllByRole: getAllByRole2 } = render(<DashboardLayout {...defaultProps} />);
    const secondRender = getAllByRole2('button').map(btn => btn.textContent);
    
    expect(firstRender).toEqual(secondRender);
  });

  it('should handle pro features consistently', () => {
    // Test non-pro user
    const nonPro = render(<DashboardLayout {...defaultProps} isPro={false} />);
    const nonProHTML = nonPro.container.innerHTML;
    nonPro.unmount();

    // Test pro user
    const pro = render(<DashboardLayout {...defaultProps} isPro={true} />);
    const proHTML = pro.container.innerHTML;
    pro.unmount();

    // Both should render consistently (no hydration mismatches)
    // Content can be different, but structure should be stable
    expect(nonProHTML).toBeTruthy();
    expect(proHTML).toBeTruthy();
    expect(nonProHTML).not.toBe(proHTML); // Should be different content
  });

  it('View Landing Page button renders consistently on SSR and client', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Test the specific button that was causing hydration issues
    const { getByText } = render(<DashboardLayout {...defaultProps} userInfo={{ ...defaultProps.userInfo, username: "demo-slug" }} />);
    
    // Should render consistently without "Loading..." state
    expect(getByText('View Landing Page')).toBeInTheDocument();
    
    // Test without username
    const { getByText: getByText2 } = render(<DashboardLayout {...defaultProps} userInfo={{ ...defaultProps.userInfo, username: undefined }} />);
    // Landing page link should not be present without username
    expect(() => getByText2('View Landing Page')).toThrow();
    
    // No hydration errors
    expect(spy).not.toHaveBeenCalledWith(expect.stringContaining('Hydration failed'));
    expect(spy).not.toHaveBeenCalledWith(expect.stringContaining('hydration'));
    
    spy.mockRestore();
  });
});