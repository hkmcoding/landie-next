import { createClient } from './server';
import { DashboardData } from '@/types/dashboard';

export async function getPublicLandingPage(username: string): Promise<DashboardData | null> {
  try {
    const supabase = await createClient();
    
    // First, get the landing page by username
    const { data: landingPageData, error: landingPageError } = await supabase
      .from('landing_pages')
      .select('*')
      .eq('username', username)
      .single();

    if (landingPageError || !landingPageData) {
      console.error('Error fetching landing page:', landingPageError);
      return null;
    }

    // Then fetch all related data
    const [servicesResult, highlightsResult, testimonialsResult, userProStatusResult] = await Promise.all([
      supabase
        .from('services')
        .select('*')
        .eq('landing_page_id', landingPageData.id),
      supabase
        .from('highlights')
        .select('*')
        .eq('landing_page_id', landingPageData.id),
      supabase
        .from('testimonials')
        .select('*')
        .eq('landing_page_id', landingPageData.id),
      supabase
        .from('user_pro_status')
        .select('*')
        .eq('user_id', landingPageData.user_id)
        .single()
    ]);

    return {
      landingPage: landingPageData,
      services: servicesResult.data || [],
      highlights: highlightsResult.data || [],
      testimonials: testimonialsResult.data || [],
      userProStatus: userProStatusResult.data
    };
  } catch (error) {
    console.error('Error in getPublicLandingPage:', error);
    return null;
  }
}

export async function checkUsernameAvailability(username: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('landing_pages')
      .select('id')
      .eq('username', username)
      .single();

    if (error && error.code === 'PGRST116') {
      // No rows returned, username is available
      return true;
    }

    // If we got data, username is taken
    return !data;
  } catch (error) {
    console.error('Error checking username availability:', error);
    return false;
  }
}