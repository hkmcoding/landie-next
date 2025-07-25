import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlanIndicator } from '@/components/ui/PlanIndicator';

// Mock the tooltip component
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children, content }: { children: React.ReactNode; content: string }) => (
    <div title={content}>{children}</div>
  ),
}));

describe('PlanIndicator', () => {
  const mockOnUpgrade = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Pro Plan', () => {
    it('renders Pro badge without CTA button', () => {
      render(
        <PlanIndicator 
          plan="pro" 
          onUpgrade={mockOnUpgrade}
        />
      );

      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('Pro');
      expect(badge).toHaveClass('bg-primary', 'text-primary-foreground');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('has correct accessibility attributes', () => {
      render(
        <PlanIndicator 
          plan="pro" 
          onUpgrade={mockOnUpgrade}
        />
      );

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-label', 'Pro plan active');
    });
  });

  describe('Trial Plan', () => {
    const trialExpiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000); // 2 days 5 hours from now

    it('renders trial countdown with correct styling', () => {
      render(
        <PlanIndicator 
          plan="trial" 
          expiresAt={trialExpiresAt}
          onUpgrade={mockOnUpgrade}
        />
      );

      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent(/Trial – \d+ d \d+ h left/);
      expect(badge).toHaveClass('border-yellow-400', 'text-yellow-700');
    });

    it('displays upgrade button with correct text', () => {
      render(
        <PlanIndicator 
          plan="trial" 
          expiresAt={trialExpiresAt}
          onUpgrade={mockOnUpgrade}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Upgrade now');
      expect(button).toHaveAttribute('aria-label', 'Upgrade now - Go to pricing page');
    });

    it('calls onUpgrade when upgrade button is clicked', () => {
      render(
        <PlanIndicator 
          plan="trial" 
          expiresAt={trialExpiresAt}
          onUpgrade={mockOnUpgrade}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(mockOnUpgrade).toHaveBeenCalledTimes(1);
    });

    it('calculates countdown correctly', () => {
      const exactlyTwoDaysAndFiveHours = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000);
      
      render(
        <PlanIndicator 
          plan="trial" 
          expiresAt={exactlyTwoDaysAndFiveHours}
          onUpgrade={mockOnUpgrade}
        />
      );

      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('Trial – 2 d 5 h left');
    });

    it('has correct accessibility attributes for trial', () => {
      render(
        <PlanIndicator 
          plan="trial" 
          expiresAt={trialExpiresAt}
          onUpgrade={mockOnUpgrade}
        />
      );

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-label', expect.stringMatching(/Pro trial with \d+ days and \d+ hours remaining/));
    });

    it('handles expired trial (0 days, 0 hours)', () => {
      const expiredDate = new Date(Date.now() - 1000); // 1 second ago
      
      render(
        <PlanIndicator 
          plan="trial" 
          expiresAt={expiredDate}
          onUpgrade={mockOnUpgrade}
        />
      );

      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('Trial – 0 d 0 h left');
    });
  });

  describe('Free Plan', () => {
    it('renders free plan badge with correct styling', () => {
      render(
        <PlanIndicator 
          plan="free" 
          onUpgrade={mockOnUpgrade}
        />
      );

      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('Free plan');
      expect(badge).toHaveClass('border-muted-foreground/50', 'text-muted-foreground');
    });

    it('displays upgrade button with correct text', () => {
      render(
        <PlanIndicator 
          plan="free" 
          onUpgrade={mockOnUpgrade}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Upgrade to Pro');
      expect(button).toHaveAttribute('aria-label', 'Upgrade to Pro - Go to pricing page');
    });

    it('calls onUpgrade when upgrade button is clicked', () => {
      render(
        <PlanIndicator 
          plan="free" 
          onUpgrade={mockOnUpgrade}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(mockOnUpgrade).toHaveBeenCalledTimes(1);
    });

    it('has correct accessibility attributes', () => {
      render(
        <PlanIndicator 
          plan="free" 
          onUpgrade={mockOnUpgrade}
        />
      );

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-label', 'Free plan active');
    });
  });

  describe('Layout and Structure', () => {
    it('renders badge and button in correct container', () => {
      render(
        <PlanIndicator 
          plan="trial" 
          expiresAt={new Date(Date.now() + 24 * 60 * 60 * 1000)}
          onUpgrade={mockOnUpgrade}
        />
      );

      const container = screen.getByRole('status').parentElement;
      expect(container).toHaveClass('flex', 'items-center', 'gap-2');
    });

    it('pro plan does not render upgrade button', () => {
      render(
        <PlanIndicator 
          plan="pro" 
          onUpgrade={mockOnUpgrade}
        />
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(mockOnUpgrade).not.toHaveBeenCalled();
    });
  });
});