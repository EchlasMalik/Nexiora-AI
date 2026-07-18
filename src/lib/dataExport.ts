import {
  ChatbotRepo,
  ConversationRepo,
  MessageRepo,
  ContactRepo,
  AppointmentRepo,
  KnowledgeDocumentRepo,
} from '@/entities'

/**
 * GDPR-style data export: every row across all 6 entities for this org, as
 * one downloadable JSON file. Messages are fetched per-conversation since
 * they're not directly org-scoped-and-listable on their own in the UI, but
 * the repo layer scopes them by org just like everything else.
 */
export async function exportOrgData(orgId: string): Promise<void> {
  const [chatbots, conversations, contacts, appointments, knowledgeDocuments] = await Promise.all([
    ChatbotRepo.list(orgId),
    ConversationRepo.list(orgId),
    ContactRepo.list(orgId),
    AppointmentRepo.list(orgId),
    KnowledgeDocumentRepo.list(orgId),
  ])

  const messagesByConversation = await Promise.all(
    conversations.map((conversation) =>
      MessageRepo.filter(orgId, { conversation_id: conversation.id }, { sort: 'created_date' })
    )
  )
  const messages = messagesByConversation.flat()

  const payload = {
    exported_at: new Date().toISOString(),
    chatbots,
    conversations,
    messages,
    contacts,
    appointments,
    knowledge_documents: knowledgeDocuments,
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `nexiora-export-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
