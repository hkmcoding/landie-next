import { createClient } from '@/lib/supabase/server';
import { DashboardService } from '@/lib/supabase/dashboard-service';
import Dashboard from './Dashboard';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.log('no user')
    return null;
  }

  // Single server-side fetch for all dashboard data
  const dashboardService = new DashboardService(true);
  
  try {
    const dashboardData = await dashboardService.getDashboardData(user.id);
    return <Dashboard initialData={dashboardData} />;
  } catch (error) {
    console.error('Dashboard data error:', error);
    return null;
  }
} 