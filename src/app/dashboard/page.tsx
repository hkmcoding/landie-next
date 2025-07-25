import { createClient } from '@/lib/supabase/server';
import { DashboardService } from '@/lib/supabase/dashboard-service';
import { redirect } from 'next/navigation';
import Dashboard from './Dashboard';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user has completed onboarding (has a landing page)
  const { data: landingPage } = await supabase
    .from('landing_pages')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!landingPage) {
    redirect('/onboarding');
  }

  // Single server-side fetch for all dashboard data
  const dashboardService = new DashboardService(true);
  
  try {
    const dashboardData = await dashboardService.getDashboardData(user.id);
    // Always use the auth email, never fall back to placeholder text
    const authEmail = user.email || 'Email not available';
    console.log('🔍 DEBUG: Auth user email:', user.email);
    console.log('🔍 DEBUG: Auth email being passed:', authEmail);
    console.log('🔍 DEBUG: Landing page contact_email:', dashboardData.landingPage?.contact_email);
    return <Dashboard initialData={dashboardData} authEmail={authEmail} />;
  } catch (error) {
    console.error('Dashboard data error:', error);
    return null;
  }
} 