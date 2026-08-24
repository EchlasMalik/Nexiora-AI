import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { faqs } from '@/content/faqs'

export function FAQAccordion() {
  return (
    <section id="faq" className="scroll-mt-20 bg-slate-50 py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl lg:text-5xl">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-lg text-brand-text-secondary">
            Can't find what you're looking for? Reach out and we'll help.
          </p>
        </div>

        <Accordion type="single" collapsible className="mt-10 w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={faq.question} value={`item-${i}`} className="border-border">
              <AccordionTrigger className="text-left text-base font-semibold text-brand-navy hover:text-violet-600 sm:text-lg">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-brand-text-secondary">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
