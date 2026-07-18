import { createRepository } from '@/lib/db'
import {
  ChatbotInputSchema,
  ConversationInputSchema,
  MessageInputSchema,
  ContactInputSchema,
  AppointmentInputSchema,
  KnowledgeDocumentInputSchema,
  type Chatbot,
  type Conversation,
  type Message,
  type Contact,
  type Appointment,
  type KnowledgeDocument,
} from './schemas'

export * from './schemas'

export const ChatbotRepo = createRepository<typeof ChatbotInputSchema, Chatbot>(
  'chatbots',
  ChatbotInputSchema
)

export const ConversationRepo = createRepository<typeof ConversationInputSchema, Conversation>(
  'conversations',
  ConversationInputSchema
)

export const MessageRepo = createRepository<typeof MessageInputSchema, Message>(
  'messages',
  MessageInputSchema
)

export const ContactRepo = createRepository<typeof ContactInputSchema, Contact>(
  'contacts',
  ContactInputSchema
)

export const AppointmentRepo = createRepository<typeof AppointmentInputSchema, Appointment>(
  'appointments',
  AppointmentInputSchema
)

export const KnowledgeDocumentRepo = createRepository<
  typeof KnowledgeDocumentInputSchema,
  KnowledgeDocument
>('knowledge_documents', KnowledgeDocumentInputSchema)
