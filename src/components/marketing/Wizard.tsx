"use client";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function Wizard() {
  return (
    <section id="wizard" aria-label="AI Wizard" className="py-16 lg:py-24 bg-primary-foreground">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-x-16 gap-y-12">
          {/* Illustration */}
            <Image
              src="/images/onboarding-image.webp"
              alt="AI Wizard Illustration"
              width={600}
              height={400}
              className="w-full h-auto rounded-xl shadow-xl"
              priority
            />
          {/* Text column */}
          <div className="space-y-6">
            <h2 className="heading-2">Your AI Page-Building Coach.</h2>
            <p className="paragraph text-muted-foreground">
              Answer a few simple questions and our AI Wizard will craft your page structure, write copy suggestions, and set up SEO—ready in under 10 minutes.
            </p>
            <ul className="space-y-2 list-disc pl-5 paragraph mb-4">
              <li>Clear, benefit-driven service descriptions</li>
              <li>Engaging highlights section auto-filled for you</li>
              <li>Instant preview—tweak copy and publish</li>
            </ul>
            <a href='/login'>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Try the AI Wizard
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
} 