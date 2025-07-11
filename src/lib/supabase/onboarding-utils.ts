import { DashboardServiceClient } from './dashboard-service-client';

export async function checkOnboardingStatus(userId: string): Promise<{
  needsOnboarding: boolean;
  reason?: string;
}> {
  try {
    const dashboardService = new DashboardServiceClient();
    const dashboardData = await dashboardService.getDashboardData(userId);
    
    const landingPage = dashboardData.landingPage;
    
    // Check if user has completed basic onboarding
    if (!landingPage) {
      return { needsOnboarding: true, reason: 'No landing page found' };
    }
    
    // Check if essential fields are filled
    if (!landingPage.name || !landingPage.username || !landingPage.bio) {
      return { needsOnboarding: true, reason: 'Missing essential information' };
    }
    
    // Check if user has at least one service or highlight
    if (dashboardData.services.length === 0 && dashboardData.highlights.length === 0) {
      return { needsOnboarding: true, reason: 'No services or highlights configured' };
    }
    
    return { needsOnboarding: false };
    
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    // If there's an error, assume user needs onboarding
    return { needsOnboarding: true, reason: 'Error checking status' };
  }
}

export async function redirectToOnboardingIfNeeded(userId: string): Promise<boolean> {
  const { needsOnboarding } = await checkOnboardingStatus(userId);
  
  if (needsOnboarding) {
    // In a real app, you'd use Next.js redirect here
    // redirect('/onboarding');
    return true;
  }
  
  return false;
}