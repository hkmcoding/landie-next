"use client";
import Image from "next/image";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";


export default function SEO() {
  const items = [
    {
      img: "/images/seo/auto-site-map-192.webp",
      title: "Auto Sitemap",
      description: "Search engines crawl every page automatically.",
    },
    {
      img: "/images/seo/meta-og-tags-192.webp",
      title: "Meta & OG Tags",
      description: "Dynamic titles, descriptions, and social previews.",
    },
    {
      img: "/images/seo/clean-urls-192.webp",
      title: "Clean URLs",
      description: "Friendly, canonical URLs for each trainer’s page.",
    },
    {
      img: "/images/seo/fast-loading-192.webp",
      title: "Fast Loading",
      description: "Optimized assets and purged Tailwind CSS.",
    },
  ];
  
  return (
    <section id="seo" aria-label="SEO That Works" className="py-16 lg:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center space-y-4">
        <h2 className="heading-2">SEO That Works</h2>
        <p className="paragraph text-muted-foreground">
          Rank higher on Google without lifting a finger—Landie handles all the technical details.
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

