import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProStatus } from '@/hooks/useProStatus';

// Mock the auth provider
const mockUser = { id: 'test-user-123' };
vi.mock('@/lib/supabase/auth-provider', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Mock the Supabase client
const mockSupabase = {
  from: vi.fn(),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}));

describe('useProStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns loading state initially', () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockReturnValue(new Promise(() => {})), // Never resolves
        }),
      }),
    });

    const { result } = renderHook(() => useProStatus());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isPro).toBe(false);
    expect(result.current.plan).toBe('free');
  });

  it('returns pro plan for active pro user without expiration', async () => {
    const mockData = {
      is_pro: true,
      pro_expires_at: null,
      override_pro: false,
      stripe_customer_id: 'cus_123',
      notes: null,
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useProStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isPro).toBe(true);
    expect(result.current.plan).toBe('pro');
    expect(result.current.expiresAt).toBeNull();
    expect(result.current.daysRemaining).toBeNull();
    expect(result.current.isOverride).toBe(false);
    expect(result.current.stripeCustomerId).toBe('cus_123');
  });

  it('returns pro plan for manual comp (override_pro = true)', async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago
    const mockData = {
      is_pro: true,
      pro_expires_at: pastDate,
      override_pro: true,
      stripe_customer_id: null,
      notes: 'Manual comp',
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useProStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isPro).toBe(true);
    expect(result.current.plan).toBe('pro');
    expect(result.current.isOverride).toBe(true);
    expect(result.current.notes).toBe('Manual comp');
    expect(result.current.daysRemaining).toBe(-1); // Expired but overridden
  });

  it('returns trial plan for active trial user', async () => {
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days from now
    const mockData = {
      is_pro: true,
      pro_expires_at: futureDate,
      override_pro: false,
      stripe_customer_id: null,
      notes: null,
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useProStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isPro).toBe(true);
    expect(result.current.plan).toBe('pro'); // Still pro because not expired
    expect(result.current.expiresAt).toBe(futureDate);
    expect(result.current.daysRemaining).toBe(2);
    expect(result.current.isOverride).toBe(false);
  });

  it('returns trial plan for expired is_pro but still in trial window', async () => {
    const futureDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(); // 1 day from now
    const mockData = {
      is_pro: false, // Already expired by cron job
      pro_expires_at: futureDate, // But expiration is still in future
      override_pro: false,
      stripe_customer_id: null,
      notes: null,
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useProStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isPro).toBe(false);
    expect(result.current.plan).toBe('trial');
    expect(result.current.expiresAt).toBe(futureDate);
    expect(result.current.daysRemaining).toBe(1);
  });

  it('returns free plan for expired trial', async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago
    const mockData = {
      is_pro: false,
      pro_expires_at: pastDate,
      override_pro: false,
      stripe_customer_id: null,
      notes: null,
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useProStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isPro).toBe(false);
    expect(result.current.plan).toBe('free');
    expect(result.current.expiresAt).toBe(pastDate);
    expect(result.current.daysRemaining).toBe(-1);
  });

  it('returns free plan when no pro_status record exists', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { code: 'PGRST116', message: 'No rows found' }
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useProStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isPro).toBe(false);
    expect(result.current.plan).toBe('free');
    expect(result.current.expiresAt).toBeNull();
    expect(result.current.daysRemaining).toBeNull();
    expect(result.current.isOverride).toBe(false);
  });

  it('calculates days remaining correctly', async () => {
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const mockData = {
      is_pro: true,
      pro_expires_at: threeDaysFromNow,
      override_pro: false,
      stripe_customer_id: null,
      notes: null,
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useProStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.daysRemaining).toBe(3);
  });

  it('handles database errors gracefully', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Database connection failed' }
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useProStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isPro).toBe(false);
    expect(result.current.plan).toBe('free');
  });
});