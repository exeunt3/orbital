// ─── Orbital Parameters ───────────────────────────────────────────────────────
// Reused from orbital — defines elliptical orbit shape

export interface OrbitalParams {
  semiMajorAxis: number
  eccentricity: number
  inclination: number
  speed: number
  phase: number
}

// ─── Participant ──────────────────────────────────────────────────────────────

export interface Participant {
  id: string                        // slug derived from name, e.g. "ada-lovelace"
  displayName: string
  email: string
  bio: string                       // extracted from README.md, or entered manually
  researchFocus: string             // 1-3 sentence summary of their domain

  visual: ParticipantVisual
  orbitalParams: OrbitalParams

  libraryMeta: LibraryMeta

  status: 'active' | 'paused'
  joinedAt: string                  // ISO date string
  lastActiveAt: string

  // Auth — simple token-based, no passwords
  token: string                     // UUID, issued at registration, never changes

  // Notification preferences
  notifyOnResonance: boolean
  resonanceThreshold: number        // 0-1, minimum finding score to trigger email (default 0.6)
}

export interface ParticipantVisual {
  color: string                     // hex
  size: number                      // sphere radius (5-12)
  traceOpacity: number
  glyph: string                     // unicode char, e.g. '◈'
}

// ─── Library ──────────────────────────────────────────────────────────────────

export interface LibraryMeta {
  participantId: string
  fileCount: number
  totalChars: number
  hasReadme: boolean                // README.md required for bridging
  files: LibraryFileMeta[]
  lastUpdated: string               // ISO date string
}

export interface LibraryFileMeta {
  filename: string                  // e.g. "phenomenology-notes.md"
  title: string                     // H1 from content, or filename without extension
  wordCount: number
  charCount: number
  tags: string[]                    // extracted from frontmatter or H2 headings
  lastModified: string
}

// Full file content — loaded on demand
export interface LibraryFile {
  participantId: string
  filename: string
  content: string
  meta: LibraryFileMeta
}

// ─── Logic Space ──────────────────────────────────────────────────────────────

export type GeometryType = 'orbital' | 'network' | 'temporal' | 'contrast'
export type TriggerType = 'schedule' | 'manual' | 'content-threshold' | 'library-update'
export type ComparisonScope = 'full-library' | 'readme-only' | 'recent-files' | 'tagged-files'
export type ResonanceMode = 'similarity' | 'contrast' | 'thematic-proximity' | 'temporal-overlap' | 'structural-echo'
export type ExcerptStrategy = 'first-n' | 'random-n' | 'heading-sample'

export interface LogicSpace {
  id: string
  name: string
  description: string
  createdBy: string                 // participantId
  createdAt: string

  geometry: GeometryConfig
  trigger: TriggerConfig
  comparison: ComparisonConfig
  resonance: ResonanceConfig

  participantIds: string[]          // empty = all active participants
  isActive: boolean
  lastRunAt: string | null
  runCount: number
}

export interface GeometryConfig {
  type: GeometryType

  orbital?: {
    useExistingOrbits: boolean
    proximityThreshold: number      // distance in sim-units
    regionCount: number
  }

  network?: {
    edgeWeightMode: 'finding-count' | 'average-score' | 'recency-weighted'
    encounterDistance: number       // minimum edge weight to trigger
  }

  temporal?: {
    windowDays: number
    alignmentMode: 'overlap' | 'sequential'
  }

  contrast?: {
    divergenceThreshold: number     // 0-1
    maxPairsPerRun: number
  }
}

export interface TriggerConfig {
  type: TriggerType

  schedule?: {
    cronExpression: string
    timezone: string
  }

  contentThreshold?: {
    minimumNewChars: number
  }

  libraryUpdate?: {
    triggerOnAnyUpload: boolean
    cooldownHours: number
  }
}

export interface ComparisonConfig {
  scope: ComparisonScope

  taggedFiles?: {
    tags: string[]
  }

  recentFiles?: {
    dayWindow: number
    maxFiles: number
  }

  maxCharsPerParticipant: number    // default 8000
  excerptStrategy: ExcerptStrategy
}

export interface ResonanceConfig {
  mode: ResonanceMode

  thematicAxes?: string[]           // for thematic-proximity mode
  structuralPatterns?: string[]     // for structural-echo mode

  minimumScoreToRecord: number      // default 0.4
  minimumScoreToNotify: number      // default 0.65
}

// ─── Resonance Finding ────────────────────────────────────────────────────────

export type FindingType = 'resonance' | 'contrast' | 'echo' | 'friction' | 'convergence'
export type FindingStatus = 'new' | 'seen' | 'acknowledged' | 'archived'

export interface ResonanceFinding {
  id: string
  logicSpaceId: string
  logicSpaceRunId: string
  participantIds: [string, string]

  filesA: string[]                  // filenames analyzed from participant A
  filesB: string[]                  // filenames analyzed from participant B

  type: FindingType
  score: number                     // 0-1

  contactPoints: ContactPoint[]
  bridgingSummary: string
  suggestedInquiry: string

  createdAt: string

  statusA: FindingStatus
  statusB: FindingStatus

  tension?: TensionDescription      // only for contrast/friction type findings
}

export interface ContactPoint {
  excerptA: string
  excerptB: string
  connectionType: 'thematic' | 'methodological' | 'terminological' | 'structural' | 'historical'
  connectionDescription: string
  resonanceScore: number
}

export interface TensionDescription {
  positionA: string
  positionB: string
  cruxStatement: string
  productiveQuestion: string
}

// ─── Notification ─────────────────────────────────────────────────────────────

export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'suppressed'

export interface Notification {
  id: string
  participantId: string
  findingId: string
  status: NotificationStatus
  sentAt: string | null
  failureReason: string | null
  emailTo: string
  emailSubject: string
  emailBodyPreview: string
}

// ─── Bridging Run ─────────────────────────────────────────────────────────────

export interface BridgingRun {
  id: string
  logicSpaceId: string
  startedAt: string
  completedAt: string | null
  pairsAnalyzed: number
  findingsGenerated: number
  notificationsSent: number
  status: 'running' | 'complete' | 'failed'
  log: string[]
}

// ─── Field State (Zustand) ────────────────────────────────────────────────────

export type FieldPhase = 'idle' | 'ready' | 'bridging' | 'displaying-finding' | 'error'

export interface FieldState {
  participants: Participant[]
  findings: ResonanceFinding[]
  logicSpaces: LogicSpace[]
  activeFinding: ResonanceFinding | null
  activeRun: BridgingRun | null
  phase: FieldPhase
  currentParticipantId: string | null
}

// ─── API Request / Response ───────────────────────────────────────────────────

export interface BridgeRequest {
  participantAId: string
  participantBId: string
  logicSpaceId: string
  runId: string
}

export interface BridgeResponse {
  finding: ResonanceFinding | null
  rawAnalysis?: string
}

export interface BatchBridgeRequest {
  logicSpaceId: string
}

export interface BatchBridgeResponse {
  run: BridgingRun
  findings: ResonanceFinding[]
}

// Stream events for live bridging display
export type BridgeStreamEvent =
  | { type: 'contact-point'; data: ContactPoint }
  | { type: 'summary'; bridgingSummary: string; suggestedInquiry: string }
  | { type: 'score'; score: number; findingType: FindingType }
  | { type: 'complete'; findingId: string | null }
  | { type: 'error'; message: string }

// ─── Filters ─────────────────────────────────────────────────────────────────

export interface FindingFilters {
  participantId?: string
  logicSpaceId?: string
  type?: FindingType
  minScore?: number
  status?: FindingStatus
  limit?: number
}

// ─── Orbital preset pool ──────────────────────────────────────────────────────
// Assigned at registration to give each participant a distinct visual orbit.

export const ORBITAL_PRESETS: OrbitalParams[] = [
  { semiMajorAxis: 180, eccentricity: 0.15, inclination: 12, speed: 0.0003, phase: 0 },
  { semiMajorAxis: 220, eccentricity: 0.35, inclination: 28, speed: 0.00025, phase: 1.2 },
  { semiMajorAxis: 160, eccentricity: 0.05, inclination: -8, speed: 0.00035, phase: 2.4 },
  { semiMajorAxis: 260, eccentricity: 0.5, inclination: 45, speed: 0.0002, phase: 3.6 },
  { semiMajorAxis: 140, eccentricity: 0.25, inclination: -20, speed: 0.0004, phase: 0.8 },
  { semiMajorAxis: 300, eccentricity: 0.6, inclination: 60, speed: 0.00015, phase: 4.8 },
  { semiMajorAxis: 200, eccentricity: 0.1, inclination: 35, speed: 0.00028, phase: 1.8 },
  { semiMajorAxis: 240, eccentricity: 0.4, inclination: -40, speed: 0.00022, phase: 5.2 },
  { semiMajorAxis: 170, eccentricity: 0.2, inclination: 15, speed: 0.00032, phase: 2.9 },
  { semiMajorAxis: 280, eccentricity: 0.45, inclination: -55, speed: 0.00018, phase: 0.3 },
]

export const GLYPH_POOL = ['◈', '◉', '◎', '⊕', '⊗', '⊙', '◇', '◆', '△', '▽', '☽', '✦', '✧', '⊞', '⊟']

export const COLOR_POOL = [
  '#c4a882', '#8eb4c8', '#b8c4a0', '#c8a8b4', '#a8b8c8',
  '#c8b890', '#90b8b0', '#b890c8', '#c89090', '#90c8a0',
  '#c8c490', '#9090c8', '#c8a090', '#90c8c8', '#b8b8b8',
]
