"use client";
import Image from "next/image";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";


export default function Features() {
  const items = [
    {
      img: "/images/features/conversion_icon.webp",
      title: "Convert More Leads",
      description:
        "Built-in CTAs and contact forms turn visitors into paying clients in seconds.",
    },
    {
      img: "/images/features/actionable_analytics_icon.webp",
      title: "Actionable Analytics",
      description:
        "Track visits, clicks, and conversions in real time—know what’s working.",
    },
    {
      img: "/images/features/code_free_setup.webp",
      title: "Code-Free Setup",
      description:
        "Launch in minutes: fill in your info, hit publish—no dev help needed.",
    },
    {
      img: "/images/features/ai_copy_assist.webp",
      title: "AI Copy Assist",
      description:
        "Generate high-converting copy and blurbs with one click—goodbye writer’s block.",
    },
  ];

  return (
    <section id="features" aria-label="Why Trainers Choose Landie" className="py-16 lg:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center space-y-4">
        <h2 className="heading-2">Why Trainers Choose Landie</h2>
        <p className="paragraph text-muted-foreground">
          Built for fitness pros to turn visitors into clients, effortlessly.
        </p>
      </div>

      <div className="mt-12 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {items.map((item) => (
            <Card key={item.title} className="flex flex-col items-center p-6">
              <Image
                src={item.img}
                alt={item.title}
                width={192}
                height={192}
                className="mb-4 rounded-xl"
              />
              <CardContent className="p-0">
                <CardHeader className="p-0 text-center">
                  <CardTitle className="header-3">{item.title}</CardTitle>
                </CardHeader>
                <p className="paragraph subtitle-2 text-center text-muted-foreground">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
