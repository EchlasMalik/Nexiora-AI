/**
 * Consumes a `data: {"text": "..."}` / `data: {"error": "..."}` SSE stream
 * (the wire format both chat-completion and public-chat emit), calling
 * `onDelta` for each text chunk. Returns the full accumulated text.
 */
export async function consumeSSEStream(response: Response, onDelta: (chunk: string) => void): Promise<string> {
  if (!response.body) return ''

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''

    for (const evt of events) {
      const dataLine = evt.split('\n').find((line) => line.startsWith('data: '))
      if (!dataLine) continue
      const payload = dataLine.slice(6)
      if (payload === '[DONE]') continue
      try {
        const parsed = JSON.parse(payload) as { text?: string; error?: string }
        if (parsed.error) return fullText
        if (parsed.text) {
          fullText += parsed.text
          onDelta(parsed.text)
        }
      } catch {
        // Ignore malformed/partial SSE chunks.
      }
    }
  }

  return fullText
}
