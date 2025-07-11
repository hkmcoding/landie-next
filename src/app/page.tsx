import Hero from "@/components/marketing/Hero";
import Features from "@/components/marketing/Features";
import Wizard from "@/components/marketing/Wizard";
import SEO from "@/components/marketing/SEO"
import Pricing from "@/components/marketing/Pricing";
import TrainerResults from "@/components/marketing/TrainerResults";
import FooterCTA from "@/components/marketing/FooterCTA";
import FooterNav from "@/components/marketing/FooterNav";

export const metadata = {
  title: "No-Code Landing Pages for Trainers | Landie",
};

export default function MarketingPage() {
  return (
    <>
      <Hero />
      <Features />
      <Wizard />
      <SEO />
      <TrainerResults />
      <Pricing />
      <FooterCTA />
      <FooterNav />
    </>
  );
} 