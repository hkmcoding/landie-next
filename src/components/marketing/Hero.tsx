"use client";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";


export default function Hero() {
  return (
    <section className="py-16 lg:py-32 bg-primary-foreground">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-y-12 lg:gap-x-16 items-center">
          
          {/* Text block */}
          <div className="space-y-6">
            <h1 className="heading-1">
              Turn Followers into Paying Clients in 10 Minutes
            </h1>
            <p className="paragraph text-muted-foreground">
              Landie handles the tech—no code, no credit card required. Leverage AI-powered recommendations to boost your client sign-ups. Let us craft your landing page so you can focus on coaching.
            </p>
            <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
              <a href="/start-free">
                <Button>
                  Start Free Trial
                </Button>
              </a>
              <Link href="/#pricing" className="flex items-center gap-2">
                <Button variant="outline">
                  See Pricing <Icons.arrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>
          
          {/* Image block */}
          <div className="relative w-full">
            <Image
              src="/images/hero-image.webp"
              alt="Landie dashboard on laptop and mobile"
              width={1200}
              height={800}
              className="w-full h-auto rounded-xl shadow-xl"
              priority
            />
          </div>
          
        </div>
      </div>
    </section>
  );
}
