// Filesystem storage helpers — server-side only.
// All participant data, libraries, findings, and logic spaces live under DATA_DIR.

import fs from 'fs/promises'
import path from 'path'
import type {
  Participant,
  LibraryMeta,
  LibraryFile,
  LibraryFileMeta,
  ResonanceFinding,
  FindingFilters,
  LogicSpace,
  ComparisonConfig,
  Notification,
} from '@/types/orbitalfork'

function getDataDir(): string {
  return process.env.DATA_DIR ?? path.join(process.cwd(), 'data')
}

function participantDir(participantId: string): string {
  return path.join(getDataDir(), 'participants', participantId)
}

function libraryDir(participantId: string): string {
  return path.join(participantDir(participantId), 'library')
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true })
}

// ─── Participant ──────────────────────────────────────────────────────────────

export async function getParticipant(id: string): Promise<Participant | null> {
  try {
    const raw = await fs.readFile(path.join(participantDir(id), 'profile.json'), 'utf-8')
    return JSON.parse(raw) as Participant
  } catch {
    return null
  }
}

export async function getAllParticipants(): Promise<Participant[]> {
  const baseDir = path.join(getDataDir(), 'participants')
  try {
    const entries = await fs.readdir(baseDir, { withFileTypes: true })
    const participants = await Promise.all(
      entries
        .filter(e => e.isDirectory())
        .map(e => getParticipant(e.name))
    )
    return participants.filter((p): p is Participant => p !== null)
  } catch {
    return []
  }
}

export async function saveParticipant(participant: Participant): Promise<void> {
  const dir = participantDir(participant.id)
  await ensureDir(dir)
  await ensureDir(libraryDir(participant.id))
  await fs.writeFile(
    path.join(dir, 'profile.json'),
    JSON.stringify(participant, null, 2),
    'utf-8'
  )
}

export async function deleteParticipant(id: string): Promise<void> {
  await fs.rm(participantDir(id), { recursive: true, force: true })
}

// ─── Library ──────────────────────────────────────────────────────────────────

export async function getLibraryMeta(participantId: string): Promise<LibraryMeta> {
  const dir = libraryDir(participantId)
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const mdFiles = entries.filter(e => e.isFile() && e.name.endsWith('.md'))

    const fileMetas = await Promise.all(
      mdFiles.map(e => getLibraryFileMeta(participantId, e.name))
    )
    const validMetas = fileMetas.filter((m): m is LibraryFileMeta => m !== null)

    return {
      participantId,
      fileCount: validMetas.length,
      totalChars: validMetas.reduce((sum, m) => sum + m.charCount, 0),
      hasReadme: validMetas.some(m => m.filename === 'README.md'),
      files: validMetas,
      lastUpdated: new Date().toISOString(),
    }
  } catch {
    return {
      participantId,
      fileCount: 0,
      totalChars: 0,
      hasReadme: false,
      files: [],
      lastUpdated: new Date().toISOString(),
    }
  }
}

async function getLibraryFileMeta(participantId: string, filename: string): Promise<LibraryFileMeta | null> {
  try {
    const filePath = path.join(libraryDir(participantId), filename)
    const [content, stat] = await Promise.all([
      fs.readFile(filePath, 'utf-8'),
      fs.stat(filePath),
    ])
    return buildFileMeta(filename, content, stat.mtime.toISOString())
  } catch {
    return null
  }
}

function buildFileMeta(filename: string, content: string, lastModified: string): LibraryFileMeta {
  const lines = content.split('\n')
  const h1Line = lines.find(l => l.startsWith('# '))
  const title = h1Line ? h1Line.replace(/^#\s+/, '').trim() : filename.replace(/\.md$/, '')
  const words = content.split(/\s+/).filter(Boolean).length
  const tags = lines
    .filter(l => l.startsWith('## '))
    .map(l => l.replace(/^##\s+/, '').trim().toLowerCase())
    .slice(0, 8)

  return {
    filename,
    title,
    wordCount: words,
    charCount: content.length,
    tags,
    lastModified,
  }
}

export async function getLibraryFile(participantId: string, filename: string): Promise<LibraryFile | null> {
  try {
    const filePath = path.join(libraryDir(participantId), filename)
    const [content, stat] = await Promise.all([
      fs.readFile(filePath, 'utf-8'),
      fs.stat(filePath),
    ])
    const meta = buildFileMeta(filename, content, stat.mtime.toISOString())
    return { participantId, filename, content, meta }
  } catch {
    return null
  }
}

export async function getAllLibraryFiles(participantId: string): Promise<LibraryFile[]> {
  const dir = libraryDir(participantId)
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const files = await Promise.all(
      entries
        .filter(e => e.isFile() && e.name.endsWith('.md'))
        .map(e => getLibraryFile(participantId, e.name))
    )
    return files.filter((f): f is LibraryFile => f !== null)
  } catch {
    return []
  }
}

export async function saveLibraryFile(
  participantId: string,
  filename: string,
  content: string
): Promise<LibraryFileMeta> {
  const dir = libraryDir(participantId)
  await ensureDir(dir)
  await fs.writeFile(path.join(dir, filename), content, 'utf-8')
  return buildFileMeta(filename, content, new Date().toISOString())
}

export async function deleteLibraryFile(participantId: string, filename: string): Promise<void> {
  await fs.rm(path.join(libraryDir(participantId), filename), { force: true })
}

/**
 * Extract library content for bridging, respecting ComparisonConfig limits.
 * README is always included first. Then other files per the scope/strategy.
 */
export async function extractLibraryExcerpts(
  participantId: string,
  config: ComparisonConfig
): Promise<LibraryFile[]> {
  const allFiles = await getAllLibraryFiles(participantId)
  const maxChars = config.maxCharsPerParticipant

  // README always first
  const readme = allFiles.find(f => f.filename === 'README.md')
  let selected: LibraryFile[] = readme ? [readme] : []
  const rest = allFiles.filter(f => f.filename !== 'README.md')

  // Apply scope filter
  let candidates: LibraryFile[]
  switch (config.scope) {
    case 'readme-only':
      candidates = []
      break
    case 'recent-files': {
      const cutoff = config.recentFiles?.dayWindow ?? 30
      const since = new Date(Date.now() - cutoff * 24 * 60 * 60 * 1000)
      candidates = rest
        .filter(f => new Date(f.meta.lastModified) > since)
        .slice(0, config.recentFiles?.maxFiles ?? 10)
      break
    }
    case 'tagged-files': {
      const requiredTags = config.taggedFiles?.tags ?? []
      candidates = rest.filter(f =>
        f.meta.tags.some(t => requiredTags.includes(t))
      )
      break
    }
    default:
      candidates = rest
  }

  // Apply excerpt strategy to trim to maxChars
  let charBudget = maxChars - (readme?.content.length ?? 0)
  if (charBudget <= 0) {
    // README alone fills the budget — truncate it
    if (readme) {
      return [{ ...readme, content: readme.content.slice(0, maxChars) }]
    }
    return []
  }

  switch (config.excerptStrategy) {
    case 'heading-sample':
      for (const file of candidates) {
        const excerpt = headingSample(file.content, Math.min(charBudget, 3000))
        if (excerpt.length === 0) continue
        selected.push({ ...file, content: excerpt })
        charBudget -= excerpt.length
        if (charBudget <= 0) break
      }
      break
    case 'random-n':
      for (const file of shuffled(candidates)) {
        const excerpt = randomParagraphSample(file.content, Math.min(charBudget, 3000))
        if (excerpt.length === 0) continue
        selected.push({ ...file, content: excerpt })
        charBudget -= excerpt.length
        if (charBudget <= 0) break
      }
      break
    default: // first-n
      for (const file of candidates) {
        const excerpt = file.content.slice(0, Math.min(charBudget, 3000))
        selected.push({ ...file, content: excerpt })
        charBudget -= excerpt.length
        if (charBudget <= 0) break
      }
  }

  return selected
}

function headingSample(content: string, maxChars: number): string {
  const lines = content.split('\n')
  const parts: string[] = []
  let chars = 0
  let inHeadingSection = false
  let sectionBuffer: string[] = []

  for (const line of lines) {
    if (line.startsWith('#')) {
      if (sectionBuffer.length > 0 && chars < maxChars) {
        const chunk = sectionBuffer.join('\n').trim()
        parts.push(chunk)
        chars += chunk.length
        sectionBuffer = []
      }
      if (chars >= maxChars) break
      sectionBuffer = [line]
      inHeadingSection = true
    } else if (inHeadingSection) {
      sectionBuffer.push(line)
      if (sectionBuffer.join('\n').length > 400) {
        const chunk = sectionBuffer.join('\n').trim()
        parts.push(chunk)
        chars += chunk.length
        sectionBuffer = []
        inHeadingSection = false
        if (chars >= maxChars) break
      }
    }
  }

  return parts.join('\n\n').slice(0, maxChars)
}

function randomParagraphSample(content: string, maxChars: number): string {
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 50)
  const shuffledParagraphs = shuffled(paragraphs)
  let result = ''
  for (const p of shuffledParagraphs) {
    if (result.length + p.length > maxChars) break
    result += (result ? '\n\n' : '') + p
  }
  return result
}

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// ─── Findings ─────────────────────────────────────────────────────────────────

function findingsDir(): string {
  return path.join(getDataDir(), 'findings')
}

export async function saveFinding(finding: ResonanceFinding): Promise<void> {
  const dir = findingsDir()
  await ensureDir(dir)
  await fs.writeFile(
    path.join(dir, `${finding.id}.json`),
    JSON.stringify(finding, null, 2),
    'utf-8'
  )
}

export async function getFinding(id: string): Promise<ResonanceFinding | null> {
  try {
    const raw = await fs.readFile(path.join(findingsDir(), `${id}.json`), 'utf-8')
    return JSON.parse(raw) as ResonanceFinding
  } catch {
    return null
  }
}

export async function getAllFindings(filters?: FindingFilters): Promise<ResonanceFinding[]> {
  const dir = findingsDir()
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const all = await Promise.all(
      entries
        .filter(e => e.isFile() && e.name.endsWith('.json'))
        .map(e => getFinding(e.name.replace('.json', '')))
    )
    let findings = all.filter((f): f is ResonanceFinding => f !== null)

    if (filters?.participantId) {
      findings = findings.filter(f => f.participantIds.includes(filters.participantId!))
    }
    if (filters?.logicSpaceId) {
      findings = findings.filter(f => f.logicSpaceId === filters.logicSpaceId)
    }
    if (filters?.type) {
      findings = findings.filter(f => f.type === filters.type)
    }
    if (filters?.minScore !== undefined) {
      findings = findings.filter(f => f.score >= filters.minScore!)
    }

    findings.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    if (filters?.limit) {
      findings = findings.slice(0, filters.limit)
    }

    return findings
  } catch {
    return []
  }
}

export async function updateFindingStatus(
  findingId: string,
  participantId: string,
  status: ResonanceFinding['statusA']
): Promise<void> {
  const finding = await getFinding(findingId)
  if (!finding) return
  if (finding.participantIds[0] === participantId) {
    finding.statusA = status
  } else if (finding.participantIds[1] === participantId) {
    finding.statusB = status
  }
  await saveFinding(finding)
}

// ─── Logic Spaces ─────────────────────────────────────────────────────────────

function logicSpacesDir(): string {
  return path.join(getDataDir(), 'logic-spaces')
}

export async function saveLogicSpace(space: LogicSpace): Promise<void> {
  const dir = logicSpacesDir()
  await ensureDir(dir)
  await fs.writeFile(
    path.join(dir, `${space.id}.json`),
    JSON.stringify(space, null, 2),
    'utf-8'
  )
}

export async function getLogicSpace(id: string): Promise<LogicSpace | null> {
  try {
    const raw = await fs.readFile(path.join(logicSpacesDir(), `${id}.json`), 'utf-8')
    return JSON.parse(raw) as LogicSpace
  } catch {
    return null
  }
}

export async function getAllLogicSpaces(): Promise<LogicSpace[]> {
  const dir = logicSpacesDir()
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const all = await Promise.all(
      entries
        .filter(e => e.isFile() && e.name.endsWith('.json'))
        .map(e => getLogicSpace(e.name.replace('.json', '')))
    )
    return all.filter((s): s is LogicSpace => s !== null)
  } catch {
    return []
  }
}

// ─── Notifications log ────────────────────────────────────────────────────────

function notificationsDir(): string {
  return path.join(getDataDir(), 'notifications')
}

export async function saveNotification(notification: Notification): Promise<void> {
  const dir = notificationsDir()
  await ensureDir(dir)
  await fs.writeFile(
    path.join(dir, `${notification.id}.json`),
    JSON.stringify(notification, null, 2),
    'utf-8'
  )
}

// ─── README parsing ───────────────────────────────────────────────────────────

/**
 * Extract bio and researchFocus from a README.md content.
 * Looks for sections named "About", "Research Focus", "Bio", or uses first paragraphs.
 */
export function parseReadme(content: string): { bio: string; researchFocus: string } {
  const lines = content.split('\n')
  const sections: Record<string, string> = {}
  let currentSection = '__intro__'
  let buffer: string[] = []

  for (const line of lines) {
    if (line.startsWith('# ')) {
      // Top-level heading — skip (it's the title)
      continue
    } else if (line.startsWith('## ')) {
      if (buffer.length > 0) {
        sections[currentSection] = buffer.join('\n').trim()
        buffer = []
      }
      currentSection = line.replace(/^##\s+/, '').trim().toLowerCase()
    } else {
      buffer.push(line)
    }
  }
  if (buffer.length > 0) {
    sections[currentSection] = buffer.join('\n').trim()
  }

  const bioKeys = ['about', 'bio', 'biography', '__intro__']
  const focusKeys = ['research focus', 'research', 'focus', 'interests', 'work']

  const bio = bioKeys.map(k => sections[k]).find(v => v && v.length > 20) ?? ''
  const researchFocus = focusKeys.map(k => sections[k]).find(v => v && v.length > 20) ?? bio

  return {
    bio: bio.slice(0, 1000),
    researchFocus: researchFocus.slice(0, 500),
  }
}
