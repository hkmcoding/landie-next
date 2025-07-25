"use client"

import React, { useState } from 'react';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';
import { OnboardingData } from '@/lib/supabase/onboarding-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function OnboardingDevPage() {
  const [showWizard, setShowWizard] = useState(false);
  const [completedData, setCompletedData] = useState<OnboardingData | null>(null);

  const mockUserId = "DEV_user-123";

  const handleComplete = (data: OnboardingData) => {
    setCompletedData(data);
    setShowWizard(false);
    console.log('Onboarding completed:', data);
  };

  const resetDemo = () => {
    setCompletedData(null);
    setShowWizard(false);
  };

  if (showWizard) {
    return (
      <div className="min-h-safe bg-background">
        <OnboardingWizard
          userId={mockUserId}
          onComplete={handleComplete}
          devMode={true}
        />
      </div>
    );
  }

  return (
    <div className="min-h-safe bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Onboarding Wizard - Development Demo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="paragraph text-muted-foreground">
              This is a development demo of the onboarding wizard. Use this to test the wizard functionality during development.
              <strong> No data will be written to the database</strong> - this is a safe demo environment.
            </p>
            
            <div className="flex gap-4">
              <Button onClick={() => setShowWizard(true)}>
                Start Onboarding Wizard
              </Button>
              
              {completedData && (
                <Button variant="outline" onClick={resetDemo}>
                  Reset Demo
                </Button>
              )}
            </div>

            {completedData && (
              <div className="mt-6 space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="subtitle-3 text-green-800 mb-2">✅ Onboarding Completed Successfully!</h3>
                  <p className="text-sm text-green-700">
                    Demo completed! No data was written to the database. Check the console for the complete data object.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg bg-muted">
                  <h3 className="subtitle-3 mb-4">Completed Onboarding Summary:</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Name:</strong> {completedData.name}</div>
                    <div><strong>Username:</strong> {completedData.username}</div>
                    <div><strong>Headline:</strong> {completedData.headline || 'Not provided'}</div>
                    <div><strong>Bio:</strong> {completedData.bio}</div>
                    <div><strong>Services:</strong> {completedData.servicesCount} configured</div>
                    <div><strong>Highlights:</strong> {completedData.highlightsCount} configured</div>
                    <div><strong>Contact Me:</strong> {completedData.wantsContactForm ? 'Yes' : 'No'}</div>
                    <div><strong>CTA Button:</strong> {completedData.wantsCTAButton ? 'Yes' : 'No'}</div>
                    {completedData.wantsCTAButton && (
                      <>
                        <div><strong>CTA Text:</strong> {completedData.ctaText}</div>
                        <div><strong>CTA URL:</strong> {completedData.ctaUrl}</div>
                      </>
                    )}
                  </div>
                </div>
                
                <details className="border rounded-lg">
                  <summary className="p-4 cursor-pointer hover:bg-muted">
                    <strong>View Complete Data Object</strong>
                  </summary>
                  <div className="p-4 border-t">
                    <pre className="text-xs overflow-auto bg-background p-3 rounded border">
                      {JSON.stringify(completedData, null, 2)}
                    </pre>
                  </div>
                </details>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}