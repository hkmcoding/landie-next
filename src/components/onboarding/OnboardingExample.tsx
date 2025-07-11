"use client"

import React, { useState } from 'react';
import OnboardingWizard from './OnboardingWizard';
import { OnboardingData } from '@/lib/supabase/onboarding-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function OnboardingWizardExample() {
  const [showWizard, setShowWizard] = useState(false);
  const [completedData, setCompletedData] = useState<OnboardingData | null>(null);

  const mockUserId = "user-123"; // In a real app, this would come from auth

  const handleComplete = (data: OnboardingData) => {
    setCompletedData(data);
    setShowWizard(false);
    console.log('Onboarding completed:', data);
  };

  if (showWizard) {
    return (
      <OnboardingWizard
        userId={mockUserId}
        onComplete={handleComplete}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Wizard Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="paragraph text-muted-foreground">
            This demo shows the onboarding wizard for new users. Click the button below to start the onboarding process.
          </p>
          
          <Button onClick={() => setShowWizard(true)}>
            Start Onboarding
          </Button>

          {completedData && (
            <div className="mt-6 p-4 border rounded-lg bg-muted">
              <h3 className="subtitle-3 mb-4">Completed Onboarding Data:</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(completedData, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}