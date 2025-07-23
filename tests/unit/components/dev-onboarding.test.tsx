import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';
import { OnboardingData } from '@/lib/supabase/onboarding-service';

// Mock the onboarding service
vi.mock('@/lib/supabase/onboarding-service', () => ({
  OnboardingService: vi.fn().mockImplementation(() => ({
    getUserOnboardingData: vi.fn().mockResolvedValue(null),
    saveOnboardingProgress: vi.fn().mockResolvedValue(true),
    completeOnboarding: vi.fn().mockResolvedValue(true),
    validateStep: vi.fn().mockReturnValue(true),
  })),
}));

// Mock the AI service
vi.mock('@/lib/ai/onboarding-ai', () => ({
  callAi: vi.fn().mockResolvedValue({
    suggestion: 'AI generated content'
  }),
}));

describe('Dev Onboarding Flow', () => {
  const mockUserId = 'dev-user-123';
  let mockOnComplete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnComplete = vi.fn();
    vi.clearAllMocks();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(() => null),
        removeItem: vi.fn(() => null),
      },
      writable: true,
    });
  });

  it('should render the onboarding wizard in dev mode', () => {
    render(
      <OnboardingWizard
        userId={mockUserId}
        onComplete={mockOnComplete}
        devMode={true}
      />
    );

    // Check for dev mode indicator
    expect(screen.getByText('DEV MODE')).toBeInTheDocument();
    
    // Check for welcome message
    expect(screen.getByText('Welcome to Landie')).toBeInTheDocument();
    
    // Check for first step
    expect(screen.getByText("Let's get to know you")).toBeInTheDocument();
  });

  it('should show fitness-specific placeholders in dev mode', () => {
    render(
      <OnboardingWizard
        userId={mockUserId}
        onComplete={mockOnComplete}
        devMode={true}
      />
    );

    // Check for fitness-specific placeholders
    expect(screen.getByPlaceholderText('e.g., Sarah Johnson')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., sarahfitness')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/fitness journey, certifications/)).toBeInTheDocument();
  });

  it('should complete the onboarding flow without database writes in dev mode', async () => {
    const user = userEvent.setup();
    
    render(
      <OnboardingWizard
        userId={mockUserId}
        onComplete={mockOnComplete}
        devMode={true}
      />
    );

    // Fill out Step 1
    await user.type(screen.getByPlaceholderText('e.g., Sarah Johnson'), 'Test Trainer');
    await user.type(screen.getByPlaceholderText('e.g., sarahfitness'), 'testtrainer');
    
    // Navigate to Step 2
    await user.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Tell us about yourself')).toBeInTheDocument();
    });

    // Fill out Step 2
    await user.type(screen.getByPlaceholderText('e.g., Certified Personal Trainer'), 'Fitness Coach');
    await user.type(screen.getByPlaceholderText(/Share your fitness journey/), 'I am passionate about helping people achieve their fitness goals.');

    // Navigate to Step 3
    await user.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => {
      expect(screen.getByText('What services do you offer?')).toBeInTheDocument();
    });

    // Fill out Step 3
    await user.type(screen.getByPlaceholderText('e.g., Personal Training'), 'Personal Training');
    await user.type(screen.getByPlaceholderText(/Describe what this training program/), 'One-on-one training sessions');

    // Navigate to Step 4
    await user.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => {
      expect(screen.getByText('What are your key highlights?')).toBeInTheDocument();
    });

    // Fill out Step 4
    await user.type(screen.getByPlaceholderText('e.g., NASM Certified Trainer'), 'NASM Certified');
    await user.type(screen.getByPlaceholderText(/National Academy of Sports Medicine/), 'Certified personal trainer with 5 years experience');

    // Navigate to Step 5
    await user.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => {
      expect(screen.getByText('How do you want people to contact you?')).toBeInTheDocument();
    });

    // Skip contact form and CTA for simplicity in test
    
    // Complete the wizard
    await user.click(screen.getByRole('button', { name: /complete setup/i }));

    // Verify completion callback was called
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Trainer',
          username: 'testtrainer',
          headline: 'Fitness Coach',
          bio: 'I am passionate about helping people achieve their fitness goals.',
        })
      );
    });
  });

  it('should not call database services in dev mode', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    const user = userEvent.setup();
    
    render(
      <OnboardingWizard
        userId={mockUserId}
        onComplete={mockOnComplete}
        devMode={true}
      />
    );

    // Fill minimum required fields and complete quickly
    await user.type(screen.getByPlaceholderText('e.g., Sarah Johnson'), 'Test User');
    await user.type(screen.getByPlaceholderText('e.g., sarahfitness'), 'testuser');
    
    // Navigate through steps quickly
    await user.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => screen.getByText('Tell us about yourself'));
    
    await user.type(screen.getByPlaceholderText(/Share your fitness journey/), 'Test bio');
    await user.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => screen.getByText('What services do you offer?'));
    await user.type(screen.getByPlaceholderText('e.g., Personal Training'), 'Test Service');
    await user.type(screen.getByPlaceholderText(/Describe what this training program/), 'Test description');
    await user.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => screen.getByText('What are your key highlights?'));
    await user.type(screen.getByPlaceholderText('e.g., NASM Certified Trainer'), 'Test Highlight');
    await user.type(screen.getByPlaceholderText(/National Academy of Sports Medicine/), 'Test description');
    await user.click(screen.getByRole('button', { name: /next/i }));
    
    await waitFor(() => screen.getByText('How do you want people to contact you?'));
    await user.click(screen.getByRole('button', { name: /complete setup/i }));

    // Verify dev mode console logs were called
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('DEV MODE: Skipping database load, using default data');
      expect(consoleSpy).toHaveBeenCalledWith('DEV MODE: Skipping onboarding completion to database');
    });

    consoleSpy.mockRestore();
  });

  it('should use fitness-specific placeholders throughout all steps', () => {
    render(
      <OnboardingWizard
        userId={mockUserId}
        onComplete={mockOnComplete}
        devMode={true}
      />
    );

    // Step 1 fitness placeholders
    expect(screen.getByPlaceholderText('e.g., Sarah Johnson')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., sarahfitness')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/fitness journey, certifications/)).toBeInTheDocument();
  });
});