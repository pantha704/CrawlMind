import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { UseCases } from "@/components/landing/use-cases";
import { PricingPreview } from "@/components/landing/pricing-preview";
import { FAQ } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <HowItWorks />
      <div id="features">
        <FeatureGrid />
      </div>
      <UseCases />
      <PricingPreview />
      <div id="faq">
        <FAQ />
      </div>
      <Footer />
    </main>
  );
}
