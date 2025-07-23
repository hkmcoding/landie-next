import { OnboardingData } from '@/lib/supabase/onboarding-service';

export type AiType = 'bio' | 'services' | 'highlights';

export interface AiResponse {
  suggestion: string | Array<{ title: string; description: string }>;
}

export async function callAi(type: AiType, userId: string, onboardingData: OnboardingData): Promise<AiResponse> {
  const response = await fetch(`/api/ai/${type}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      onboarding: onboardingData,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate ${type} suggestion`);
  }

  return response.json();
}