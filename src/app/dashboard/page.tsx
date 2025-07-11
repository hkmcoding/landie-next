import { createClient } from '@/lib/supabase/server';
import Dashboard from './Dashboard';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.log('no user')
    return null;
  }

  // Query using user.id
  const { data: landingPage, error } = await supabase
    .from('landing_pages')
    .select('onboarding_data')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!landingPage || error) {
    // redirect('/onboarding');
    return null;
  }

  const onboardingData = landingPage?.onboarding_data || null;

  return <Dashboard onboardingData={onboardingData} />;
} 