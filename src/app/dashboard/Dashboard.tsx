'use client';
import { DashboardContainer } from '@/components/dashboard/DashboardContainer';
import { OnboardingData } from '@/stores/onboarding';

interface DashboardProps {
  onboardingData: OnboardingData | null;
}

export default function Dashboard({}: DashboardProps) {
  return <DashboardContainer />;
} 