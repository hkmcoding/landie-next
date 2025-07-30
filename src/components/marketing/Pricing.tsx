"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useState } from "react";

export default function Pricing() {
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      // Check if user is logged in first
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Redirect to login with return URL
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname + '#pricing');
        return;
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <section id="pricing" aria-label="Simple, Transparent Pricing" className="py-16 lg:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center space-y-4">
          <h2 className="heading-2">Simple, Transparent Pricing</h2>
          <p className="paragraph text-muted-foreground">
            Choose the plan that works best for you—upgrade any time.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
          {/* Free Plan */}
          <Card className="flex flex-col p-6 relative bg-muted border-0 shadow-sm rounded-xl">
            <div className="flex flex-col items-center gap-2 mb-6">
              <div className="heading-3">Free</div>
              <div className="paragraph mt-2 mb-4">
                <span className="heading-2 font-bold">$0</span>
                <span className="paragraph-md text-muted-foreground"> / month</span>
              </div>
            </div>
            <ul className="list-none space-y-2 mb-6">
              {[
                "AI Assitant for Bio, Services, and Highlights",
                "Basic analytics",
                "Community support",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 paragraph">
                  <Check className="text-primary w-5 h-5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto flex flex-col gap-2">
              <a href='/register'>
                <Button variant="outline" className="w-full">Start for Free</Button>
              </a>
              <p className="caption text-muted-foreground text-center">No credit card required</p>
            </div>
          </Card>

          {/* Pro Monthly Early Adopter Plan */}
          <Card className="flex flex-col p-6 relative bg-background border border-primary shadow-sm rounded-xl">
            <div className="flex flex-col items-center gap-2 mb-6">
              <span className="caption bg-accent text-accent-foreground px-3 py-1 rounded-full absolute -top-4 left-1/2 -translate-x-1/2 shadow-sm">Best Value</span>
              <div className="heading-3 mt-4">Pro Monthly Early Adopter</div>
              <div className="paragraph mt-2 mb-4">
                <div className="flex items-end justify-center gap-2">
                  <span className="text-4xl font-bold text-muted-foreground line-through">$49</span>
                  <span className="text-4xl font-bold">$30</span>
                  <span className="text-base font-medium text-muted-foreground"> / month</span>
                </div>
              </div>
            </div>
            <ul className="list-none space-y-2 mb-6">
              {[
                "Unlimited AI improvements",
                "Advanced analytics",
                "Priority support",
                "Custom branding",
                "Early access to new features",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 paragraph">
                  <Check className="text-primary w-5 h-5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto flex flex-col gap-2">
              <Button 
                className="w-full" 
                onClick={handleUpgrade}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Choose Early Adopter'}
              </Button>
              <p className="caption text-muted-foreground text-center">Cancel anytime</p>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}