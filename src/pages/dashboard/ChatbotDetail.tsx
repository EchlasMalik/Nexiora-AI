import { Link, useParams } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { ArrowLeft, Bot, Code2, ExternalLink, BookOpen, Settings as SettingsIcon } from 'lucide-react'
import { useOrg } from '@/contexts/OrgContext'
import { ChatbotRepo, KnowledgeDocumentRepo } from '@/entities'
import { DashboardLayout } from '@/components/DashboardLayout'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { EmbedTab } from '@/components/chatbots/detail/EmbedTab'
import { LivePreviewTab } from '@/components/chatbots/detail/LivePreviewTab'
import { KnowledgeTab } from '@/components/chatbots/detail/KnowledgeTab'
import { SettingsTab } from '@/components/chatbots/detail/SettingsTab'

export default function ChatbotDetail() {
  const { id = '' } = useParams<{ id: string }>()
  const { orgId } = useOrg()

  const [chatbotQuery, documentsQuery] = useQueries({
    queries: [
      {
        queryKey: ['chatbot', orgId, id],
        queryFn: () => ChatbotRepo.get(orgId!, id),
        enabled: !!orgId && !!id,
      },
      {
        queryKey: ['knowledge-documents', orgId, id],
        queryFn: () => KnowledgeDocumentRepo.filter(orgId!, { chatbot_id: id }),
        enabled: !!orgId && !!id,
      },
    ],
  })

  const chatbot = chatbotQuery.data
  const documents = documentsQuery.data ?? []
  const isLoading = chatbotQuery.isLoading || documentsQuery.isLoading

  return (
    <DashboardLayout>
      <Link
        to="/dashboard/chatbots"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-text-secondary hover:text-brand-navy"
      >
        <ArrowLeft className="size-4" />
        Back to chatbots
      </Link>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <LoadingSpinner />
        </div>
      ) : !chatbot ? (
        <div className="rounded-2xl border border-border bg-white py-20 text-center text-sm text-brand-text-secondary">
          Chatbot not found.
        </div>
      ) : (
        <>
          <div className="mb-8 flex items-center gap-4">
            <div
              className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-white"
              style={{ backgroundColor: chatbot.theme_color || '#7C3AED' }}
            >
              <Bot className="size-6" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">{chatbot.name}</h1>
              <p className="truncate text-sm text-brand-text-secondary">
                {[chatbot.company_name, chatbot.industry].filter(Boolean).join(' · ') ||
                  'No company or industry set'}
              </p>
            </div>
          </div>

          <Tabs defaultValue="embed">
            <TabsList className="w-full sm:w-fit">
              <TabsTrigger value="embed" className="gap-1.5">
                <Code2 className="size-4" />
                <span className="hidden sm:inline">Embed</span>
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-1.5">
                <ExternalLink className="size-4" />
                <span className="hidden sm:inline">Live Preview</span>
              </TabsTrigger>
              <TabsTrigger value="knowledge" className="gap-1.5">
                <BookOpen className="size-4" />
                <span className="hidden sm:inline">Knowledge Base</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5">
                <SettingsIcon className="size-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="embed" className="mt-6">
              <EmbedTab chatbot={chatbot} />
            </TabsContent>
            <TabsContent value="preview" className="mt-6">
              <LivePreviewTab chatbot={chatbot} />
            </TabsContent>
            <TabsContent value="knowledge" className="mt-6">
              <KnowledgeTab chatbotId={chatbot.id} documents={documents} />
            </TabsContent>
            <TabsContent value="settings" className="mt-6">
              <SettingsTab chatbot={chatbot} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </DashboardLayout>
  )
}
