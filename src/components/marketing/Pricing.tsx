"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export default function Pricing() {
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
                "10 AI improvements per week",
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
              <Button variant="outline" className="w-full">Start for Free</Button>
              <p className="caption text-muted-foreground text-center">No credit card required</p>
            </div>
          </Card>

          {/* Pro Monthly Early Adopter Plan */}
          <Card className="flex flex-col p-6 relative bg-background border border-primary shadow-sm rounded-xl">
            <div className="flex flex-col items-center gap-2 mb-6">
              <span className="caption bg-accent text-accent-foreground px-3 py-1 rounded-full absolute -top-4 left-1/2 -translate-x-1/2 shadow-sm">Best Value</span>
              <div className="heading-3 mt-4">Pro Monthly Early Adopter</div>
              <div className="paragraph mt-2 mb-4">
                <span className="text-4xl font-bold">$6</span>
                <span className="text-base font-medium text-muted-foreground"> / month</span>
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
              <Button className="w-full">Choose Early Adopter</Button>
              <p className="caption text-muted-foreground text-center">Cancel anytime</p>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}