import { z } from 'zod'

/**
 * Base fields shared by every persisted entity.
 * `org_id` scopes rows to a tenant (workspace) for multi-tenant isolation — this is the
 * boundary every repository query filters by. `created_by` is the user who created the
 * row, kept for audit/display only; it is never used for access control.
 */
const baseFields = {
  id: z.string(),
  org_id: z.string(),
  created_by: z.string().nullable(),
  created_date: z.string(),
  updated_date: z.string(),
}

const baseSchema = z.object(baseFields)
export type BaseEntity = z.infer<typeof baseSchema>

// ---------------------------------------------------------------------------
// Chatbot
// ---------------------------------------------------------------------------

export const ChatbotToneEnum = z.enum([
  'friendly',
  'professional',
  'luxury',
  'playful',
  'supportive',
  'sales',
])
export type ChatbotTone = z.infer<typeof ChatbotToneEnum>

export const ChatbotPositionEnum = z.enum(['bottom-right', 'bottom-left'])
export type ChatbotPosition = z.infer<typeof ChatbotPositionEnum>

export const ChatbotStatusEnum = z.enum(['active', 'paused', 'draft'])
export type ChatbotStatus = z.infer<typeof ChatbotStatusEnum>

export const SuggestedQuestionSchema = z.object({
  question: z.string().min(1),
  answer: z.string().optional().default(''),
})
export type SuggestedQuestion = z.infer<typeof SuggestedQuestionSchema>

export const ChatbotLinkSchema = z.object({
  label: z.string().min(1),
  url: z.string().min(1),
})
export type ChatbotLink = z.infer<typeof ChatbotLinkSchema>

export const ChatbotInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  company_name: z.string().optional().default(''),
  business_description: z.string().optional().default(''),
  industry: z.string().optional().default(''),
  tone: ChatbotToneEnum.default('professional'),
  welcome_message: z.string().optional().default(''),
  theme_color: z.string().default('#7C3AED'),
  avatar_url: z.string().optional().default(''),
  logo_url: z.string().optional().default(''),
  suggested_questions: z.array(SuggestedQuestionSchema).default([]),
  links: z.array(ChatbotLinkSchema).default([]),
  faqs: z.array(SuggestedQuestionSchema).default([]),
  embed_id: z.string().optional().default(''),
  position: ChatbotPositionEnum.default('bottom-right'),
  powered_by_branding: z.boolean().default(true),
  business_hours: z.string().optional().default(''),
  offline_message: z.string().optional().default(''),
  fallback_message: z.string().optional().default(''),
  custom_prompt: z.string().optional().default(''),
  booking_url: z.string().optional().default(''),
  accepts_appointments: z.boolean().default(true),
  accepts_lead_capture: z.boolean().default(true),
  status: ChatbotStatusEnum.default('active'),
})
export type ChatbotInput = z.infer<typeof ChatbotInputSchema>

export const ChatbotSchema = baseSchema.extend(ChatbotInputSchema.shape)
export type Chatbot = z.infer<typeof ChatbotSchema>

// ---------------------------------------------------------------------------
// Conversation
// ---------------------------------------------------------------------------

export const ConversationStatusEnum = z.enum(['ai', 'human', 'closed'])
export type ConversationStatus = z.infer<typeof ConversationStatusEnum>

export const SentimentEnum = z.enum(['positive', 'neutral', 'negative'])
export type Sentiment = z.infer<typeof SentimentEnum>

export const ConversationInputSchema = z.object({
  chatbot_id: z.string().min(1),
  visitor_id: z.string().optional().default(''),
  visitor_name: z.string().optional().default(''),
  status: ConversationStatusEnum.default('ai'),
  tags: z.array(z.string()).default([]),
  sentiment: SentimentEnum.default('neutral'),
  lead_score: z.number().default(0),
  summary: z.string().optional().default(''),
  unread: z.boolean().default(false),
})
export type ConversationInput = z.infer<typeof ConversationInputSchema>

export const ConversationSchema = baseSchema.extend(ConversationInputSchema.shape)
export type Conversation = z.infer<typeof ConversationSchema>

// ---------------------------------------------------------------------------
// Message
// ---------------------------------------------------------------------------

export const MessageRoleEnum = z.enum(['user', 'assistant', 'operator'])
export type MessageRole = z.infer<typeof MessageRoleEnum>

export const MessageInputSchema = z.object({
  conversation_id: z.string().min(1),
  role: MessageRoleEnum,
  content: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
})
export type MessageInput = z.infer<typeof MessageInputSchema>

export const MessageSchema = baseSchema.extend(MessageInputSchema.shape)
export type Message = z.infer<typeof MessageSchema>

// ---------------------------------------------------------------------------
// Contact
// ---------------------------------------------------------------------------

export const ContactStatusEnum = z.enum(['new', 'qualified', 'contacted', 'won', 'lost'])
export type ContactStatus = z.infer<typeof ContactStatusEnum>

export const ContactInputSchema = z.object({
  chatbot_id: z.string().min(1),
  conversation_id: z.string().optional().default(''),
  name: z.string().optional().default(''),
  email: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  company: z.string().optional().default(''),
  requirements: z.string().optional().default(''),
  budget: z.string().optional().default(''),
  timeline: z.string().optional().default(''),
  status: ContactStatusEnum.default('new'),
})
export type ContactInput = z.infer<typeof ContactInputSchema>

export const ContactSchema = baseSchema.extend(ContactInputSchema.shape)
export type Contact = z.infer<typeof ContactSchema>

// ---------------------------------------------------------------------------
// Appointment
// ---------------------------------------------------------------------------

export const AppointmentStatusEnum = z.enum(['pending', 'confirmed', 'completed', 'cancelled'])
export type AppointmentStatus = z.infer<typeof AppointmentStatusEnum>

export const AppointmentInputSchema = z.object({
  chatbot_id: z.string().min(1),
  conversation_id: z.string().optional().default(''),
  contact_name: z.string().optional().default(''),
  contact_email: z.string().optional().default(''),
  contact_phone: z.string().optional().default(''),
  scheduled_at: z.string().optional().default(''),
  timezone: z.string().optional().default(''),
  status: AppointmentStatusEnum.default('pending'),
  source: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})
export type AppointmentInput = z.infer<typeof AppointmentInputSchema>

export const AppointmentSchema = baseSchema.extend(AppointmentInputSchema.shape)
export type Appointment = z.infer<typeof AppointmentSchema>

// ---------------------------------------------------------------------------
// KnowledgeDocument
// ---------------------------------------------------------------------------

export const KnowledgeDocumentTypeEnum = z.enum(['text', 'url', 'pdf', 'faq', 'note'])
export type KnowledgeDocumentType = z.infer<typeof KnowledgeDocumentTypeEnum>

export const KnowledgeDocumentStatusEnum = z.enum(['processing', 'ready', 'failed'])
export type KnowledgeDocumentStatus = z.infer<typeof KnowledgeDocumentStatusEnum>

export const KnowledgeDocumentInputSchema = z.object({
  chatbot_id: z.string().min(1),
  title: z.string().min(1),
  content: z.string().optional().default(''),
  type: KnowledgeDocumentTypeEnum.default('text'),
  source_url: z.string().optional().default(''),
  status: KnowledgeDocumentStatusEnum.default('ready'),
  chunk_count: z.number().default(0),
})
export type KnowledgeDocumentInput = z.infer<typeof KnowledgeDocumentInputSchema>

export const KnowledgeDocumentSchema = baseSchema.extend(KnowledgeDocumentInputSchema.shape)
export type KnowledgeDocument = z.infer<typeof KnowledgeDocumentSchema>
