"use client";

import { Button } from "@/components/ui/button";

export default function FooterCTA() {
  return (
    <section className="bg-primary/90 py-16">
      <div className="max-w-3xl mx-auto text-center px-6 lg:px-8 space-y-4">
        <h2 className="heading-2 text-primary-foreground">Ready to grow your business?</h2>
        <p className="paragraph text-primary-foreground">Get started with a free trial—no credit card required!</p>
        
        <a href="/start-free" className="inline-flex mx-auto">
          <Button variant='secondary' round>
            Start Free Trial
          </Button>
        </a>
      </div>
    </section>
  );
} 