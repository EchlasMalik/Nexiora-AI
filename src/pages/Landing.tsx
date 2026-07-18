import { Navbar } from '@/components/landing/Navbar'
import { Hero } from '@/components/landing/Hero'
import { LogosBar } from '@/components/landing/LogosBar'
import { FeaturesGrid } from '@/components/landing/FeaturesGrid'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { WhyNexiora } from '@/components/landing/WhyNexiora'
import { Pricing } from '@/components/landing/Pricing'
import { FAQAccordion } from '@/components/landing/FAQAccordion'
import { CTASection } from '@/components/landing/CTASection'
import { Footer } from '@/components/landing/Footer'

export default function Landing() {
  return (
    <div className="min-h-screen bg-brand-light-bg">
      <Navbar />
      <main>
        <Hero />
        <LogosBar />
        <FeaturesGrid />
        <HowItWorks />
        <WhyNexiora />
        <Pricing />
        <FAQAccordion />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
