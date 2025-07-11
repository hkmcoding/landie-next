"use client"

import React from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingWizard } from '@/components/onboarding';
import { OnboardingData } from '@/lib/supabase/onboarding-service';
import { useAuth } from '@/lib/supabase/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleOnboardingComplete = (data: OnboardingData) => {
    console.log('Onboarding completed:', data);
    // Redirect to dashboard after successful onboarding
    router.push('/dashboard');
  };

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              You need to be logged in to access the onboarding process.
            </p>
            <Button 
              onClick={() => router.push('/login')}
              className="w-full"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <OnboardingWizard
        userId={user.id}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
}