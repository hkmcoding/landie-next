import { createClient } from '@/lib/supabase/server';
import DevAnalytics from './DevAnalytics';

export default async function DevAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return <DevAnalytics />;
}