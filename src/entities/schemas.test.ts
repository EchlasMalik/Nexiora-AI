import { describe, expect, it } from 'vitest'
import {
  ChatbotInputSchema,
  ConversationInputSchema,
  MessageInputSchema,
  AppointmentInputSchema,
} from './schemas'

describe('ChatbotInputSchema', () => {
  it('rejects a missing name', () => {
    expect(ChatbotInputSchema.safeParse({}).success).toBe(false)
  })

  it('fills in every default when only name is provided', () => {
    const result = ChatbotInputSchema.parse({ name: 'Aria' })
    expect(result).toMatchObject({
      name: 'Aria',
      tone: 'professional',
      status: 'active',
      position: 'bottom-right',
      powered_by_branding: true,
      theme_color: '#7C3AED',
      suggested_questions: [],
    })
  })

  it('rejects an unknown tone value', () => {
    const result = ChatbotInputSchema.safeParse({ name: 'Aria', tone: 'sarcastic' })
    expect(result.success).toBe(false)
  })
})

describe('ConversationInputSchema', () => {
  it('requires a chatbot_id', () => {
    expect(ConversationInputSchema.safeParse({}).success).toBe(false)
  })

  it('defaults status to ai and unread to false', () => {
    const result = ConversationInputSchema.parse({ chatbot_id: 'bot_123' })
    expect(result.status).toBe('ai')
    expect(result.unread).toBe(false)
    expect(result.lead_score).toBe(0)
  })
})

describe('MessageInputSchema', () => {
  it('rejects empty message content', () => {
    const result = MessageInputSchema.safeParse({ conversation_id: 'conv_1', role: 'user', content: '' })
    expect(result.success).toBe(false)
  })

  it('rejects a role outside user/assistant/operator', () => {
    const result = MessageInputSchema.safeParse({ conversation_id: 'conv_1', role: 'system', content: 'hi' })
    expect(result.success).toBe(false)
  })

  it('accepts a valid message and defaults metadata to an empty object', () => {
    const result = MessageInputSchema.parse({ conversation_id: 'conv_1', role: 'user', content: 'Hello' })
    expect(result.metadata).toEqual({})
  })
})

describe('AppointmentInputSchema', () => {
  it('defaults status to pending when not specified', () => {
    const result = AppointmentInputSchema.parse({ chatbot_id: 'bot_123' })
    expect(result.status).toBe('pending')
    expect(result.source).toBe('')
  })

  it('rejects an invalid status', () => {
    const result = AppointmentInputSchema.safeParse({ chatbot_id: 'bot_123', status: 'archived' })
    expect(result.success).toBe(false)
  })
})
