import Anthropic from '@anthropic-ai/sdk'

let _client: Anthropic | null = null

export function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set.')
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _client
}

// Sonnet for bridging analysis — analytical, not generative fiction
export const BRIDGING_MODEL = 'claude-sonnet-4-6'

export async function complete(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 2000,
  model = BRIDGING_MODEL
): Promise<string> {
  const client = getClient()
  const msg = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })
  const block = msg.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')
  return block.text
}
