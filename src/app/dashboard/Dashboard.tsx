'use client';
import { DashboardData } from '@/types/dashboard';
import { DashboardDataProvider } from '@/contexts/DashboardDataContext';
import { DashboardContainer } from '@/components/dashboard/DashboardContainer';

interface DashboardProps {
  initialData: DashboardData;
}

export default function Dashboard({ initialData }: DashboardProps) {
  return (
    <DashboardDataProvider initialData={initialData}>
      <DashboardContainer />
    </DashboardDataProvider>
  );
} 