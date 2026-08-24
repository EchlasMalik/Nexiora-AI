import { Navbar } from '@/components/landing/Navbar'
import { Hero } from '@/components/landing/Hero'
import { LogosBar } from '@/components/landing/LogosBar'
import { Problem } from '@/components/landing/Problem'
import { FeaturesGrid } from '@/components/landing/FeaturesGrid'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { WhyNexiora } from '@/components/landing/WhyNexiora'
import { UseCases } from '@/components/landing/UseCases'
import { Pricing } from '@/components/landing/Pricing'
import { FAQAccordion } from '@/components/landing/FAQAccordion'
import { CTASection } from '@/components/landing/CTASection'
import { Footer } from '@/components/landing/Footer'
import { useDocumentHead } from '@/lib/seo/useDocumentHead'
import { SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION } from '@/lib/seo/siteConfig'
import { faqs } from '@/content/faqs'
import { plans } from '@/content/pricingPlans'

const HOMEPAGE_TITLE = 'Nexiora AI - The AI Chatbot That Converts Visitors Into Customers'

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/Nexiora-AI.png`,
}

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
}

const softwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  description: DEFAULT_DESCRIPTION,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: SITE_URL,
  // Only real, currently-displayed prices — the Enterprise "Custom" tier has
  // no fixed price, so it's deliberately excluded rather than asserting one.
  offers: plans
    .filter((plan) => plan.priceGBP !== null)
    .map((plan) => ({
      '@type': 'Offer',
      name: plan.name,
      price: String(plan.priceGBP),
      priceCurrency: 'GBP',
    })),
}

// Mirrors the FAQAccordion component exactly (same `faqs` import) — FAQ
// structured data must match visible page content, never invent questions.
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
}

export default function Landing() {
  useDocumentHead({
    title: HOMEPAGE_TITLE,
    description: DEFAULT_DESCRIPTION,
    path: '/',
    structuredData: [organizationSchema, websiteSchema, softwareApplicationSchema, faqSchema],
  })

  return (
    <div className="min-h-screen bg-brand-light-bg">
      <Navbar />
      <main>
        <Hero />
        <LogosBar />
        <Problem />
        <FeaturesGrid />
        <HowItWorks />
        <WhyNexiora />
        <UseCases />
        <Pricing />
        <FAQAccordion />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
