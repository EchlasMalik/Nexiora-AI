import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const faqs = [
  {
    question: 'How does Nexiora AI work?',
    answer:
      'You create a chatbot, train it on your business content, and embed one script tag on your site. From there it answers questions, captures leads, and books meetings automatically.',
  },
  {
    question: 'Do I need any coding experience to set it up?',
    answer:
      'No. Everything is configured from the dashboard, and going live only requires pasting a single script tag into your site.',
  },
  {
    question: 'Can I train the chatbot on my own content?',
    answer:
      'Yes — upload documents, paste FAQs, or link pages from your website. Your chatbot only answers from what you give it.',
  },
  {
    question: "What happens when the AI can't answer a question?",
    answer:
      "You can set a fallback message and hand tricky conversations off to a human teammate without the visitor losing context.",
  },
  {
    question: 'Can I cancel or change my plan anytime?',
    answer: 'Yes, you can upgrade, downgrade, or cancel your subscription at any time from Billing.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'Every chatbot and its conversations are isolated to your account, and your knowledge base content is never shared across accounts.',
  },
]

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
