// Single source of truth for the landing page's FAQ content — shared by
// FAQAccordion.tsx (visible UI) and the homepage's FAQPage JSON-LD, so the
// structured data can never claim a question/answer the page doesn't
// actually show (search engines penalize FAQ schema that doesn't match
// visible content).
export interface Faq {
  question: string
  answer: string
}

export const faqs: Faq[] = [
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
