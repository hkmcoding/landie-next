import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Next.js redirect - it should throw to stop execution when called
const mockRedirect = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`);
});
vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

// Mock Dashboard component to avoid deep dependency issues
vi.mock('@/app/dashboard/Dashboard', () => ({
  default: vi.fn(() => 'Dashboard Component'),
}));

// Mock DashboardService
const mockGetDashboardData = vi.fn();
vi.mock('@/lib/supabase/dashboard-service', () => ({
  DashboardService: vi.fn().mockImplementation(() => ({
    getDashboardData: mockGetDashboardData,
  })),
}));

describe('Dashboard Page Redirect Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset redirect mock to throw by default
    mockRedirect.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  it('redirects to /login when user is not authenticated', async () => {
    // Mock no user
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null }
    });

    // Import the component dynamically to ensure mocks are applied
    const { default: DashboardPage } = await import('@/app/dashboard/page');
    
    await expect(DashboardPage()).rejects.toThrow('NEXT_REDIRECT:/login');
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('redirects to /onboarding when user has no landing page', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    
    // Mock authenticated user
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser }
    });

    // Mock no landing page
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null });

    mockSupabaseClient.from.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      maybeSingle: mockMaybeSingle,
    });

    const { default: DashboardPage } = await import('@/app/dashboard/page');
    await expect(DashboardPage()).rejects.toThrow('NEXT_REDIRECT:/onboarding');

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('landing_pages');
    expect(mockSelect).toHaveBeenCalledWith('id');
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
    expect(mockRedirect).toHaveBeenCalledWith('/onboarding');
  });

  it('renders dashboard when user has completed onboarding', async () => {
    // Don't throw for this test
    mockRedirect.mockImplementation(() => {});
    
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    
    // Mock authenticated user
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser }
    });

    // Mock existing landing page
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockMaybeSingle = vi.fn().mockResolvedValue({ 
      data: { id: 'landing-page-123' } 
    });

    mockSupabaseClient.from.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      maybeSingle: mockMaybeSingle,
    });

    // Mock dashboard service
    mockGetDashboardData.mockResolvedValue({
      landingPage: { id: 'landing-page-123' }
    });

    const { default: DashboardPage } = await import('@/app/dashboard/page');
    const result = await DashboardPage();

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(mockGetDashboardData).toHaveBeenCalledWith('user-123');
  });
});