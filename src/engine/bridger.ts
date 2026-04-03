// Core bridging logic: assembles excerpt payload, calls Claude, parses finding.


import { complete } from '@/lib/claude'
import { buildBridgeSystemPrompt, buildBridgeUserPrompt } from '@/lib/prompts'
import { extractLibraryExcerpts, saveFinding } from '@/lib/storage'
import type {
  Participant,
  LogicSpace,
  ResonanceFinding,
  ContactPoint,
  TensionDescription,
  FindingType,
} from '@/types/orbitalfork'

export async function runBridge(
  participantA: Participant,
  participantB: Participant,
  logicSpace: LogicSpace,
  runId: string
): Promise<ResonanceFinding | null> {
  // Extract library excerpts for each participant
  const [filesA, filesB] = await Promise.all([
    extractLibraryExcerpts(participantA.id, logicSpace.comparison),
    extractLibraryExcerpts(participantB.id, logicSpace.comparison),
  ])

  if (!filesA.some(f => f.filename === 'README.md') || !filesB.some(f => f.filename === 'README.md')) {
    // Require README for bridging
    return null
  }

  const systemPrompt = buildBridgeSystemPrompt(logicSpace)
  const userPrompt = buildBridgeUserPrompt(participantA, participantB, filesA, filesB, runId)

  let raw: string
  try {
    raw = await complete(systemPrompt, userPrompt, 2500)
  } catch (err) {
    console.error('[bridger] Claude call failed:', err)
    return null
  }

  const parsed = extractJson(raw)
  if (!parsed) {
    console.error('[bridger] Could not extract JSON from Claude response')
    return null
  }

  const score = typeof parsed.overallScore === 'number' ? parsed.overallScore : 0
  if (score < logicSpace.resonance.minimumScoreToRecord) {
    return null
  }

  const rawContactPoints = Array.isArray(parsed.contactPoints) ? parsed.contactPoints : []
  const contactPoints: ContactPoint[] = rawContactPoints.map((cp: Record<string, unknown>) => ({
    excerptA: String(cp.excerptA ?? ''),
    excerptB: String(cp.excerptB ?? ''),
    connectionType: String(cp.connectionType ?? 'thematic') as ContactPoint['connectionType'],
    connectionDescription: String(cp.connectionDescription ?? ''),
    resonanceScore: typeof cp.resonanceScore === 'number' ? cp.resonanceScore : 0,
  }))

  const findingType = String(parsed.findingType ?? 'resonance') as FindingType
  const hasTension = findingType === 'contrast' || findingType === 'friction'
  let tension: TensionDescription | undefined

  if (hasTension && parsed.tension) {
    const t = parsed.tension as Record<string, unknown>
    tension = {
      positionA: String(t.positionA ?? ''),
      positionB: String(t.positionB ?? ''),
      cruxStatement: String(t.cruxStatement ?? ''),
      productiveQuestion: String(t.productiveQuestion ?? ''),
    }
  }

  const finding: ResonanceFinding = {
    id: crypto.randomUUID(),
    logicSpaceId: logicSpace.id,
    logicSpaceRunId: runId,
    participantIds: [participantA.id, participantB.id],
    filesA: filesA.map(f => f.filename),
    filesB: filesB.map(f => f.filename),
    type: findingType,
    score,
    contactPoints,
    bridgingSummary: String(parsed.bridgingSummary ?? ''),
    suggestedInquiry: String(parsed.suggestedInquiry ?? ''),
    createdAt: new Date().toISOString(),
    statusA: 'new',
    statusB: 'new',
    ...(tension ? { tension } : {}),
  }

  await saveFinding(finding)
  return finding
}

function extractJson(text: string): Record<string, unknown> | null {
  // Find the outermost { ... } block
  const start = text.indexOf('{')
  if (start === -1) return null

  let depth = 0
  let end = -1
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}') {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }

  if (end === -1) return null

  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
}
