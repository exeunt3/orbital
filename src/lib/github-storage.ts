// GitHub Contents API storage backend.
// Used automatically when GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO are set.
// Path layout in the repo mirrors the local filesystem:
//   participants/{id}/profile.json
//   participants/{id}/library/{filename}.md
//   findings/{id}.json
//   logic-spaces/{id}.json
//   notifications/{id}.json
// Set GITHUB_DATA_PATH to nest everything under a subdirectory (e.g. "data").
// Set GITHUB_BRANCH to target a branch other than "main".

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

const API = 'https://api.github.com'

function cfg() {
  return {
    token: process.env.GITHUB_TOKEN!,
    owner: process.env.GITHUB_OWNER!,
    repo: process.env.GITHUB_REPO!,
    branch: process.env.GITHUB_BRANCH ?? 'main',
    base: process.env.GITHUB_DATA_PATH ?? '',
  }
}

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

function repoPath(p: string): string {
  const base = cfg().base
  return base ? `${base}/${p}` : p
}

// ─── Low-level GitHub API primitives ─────────────────────────────────────────

async function ghGet(filePath: string): Promise<{ content: string; sha: string } | null> {
  const { token, owner, repo, branch } = cfg()
  const res = await fetch(
    `${API}/repos/${owner}/${repo}/contents/${repoPath(filePath)}?ref=${encodeURIComponent(branch)}`,
    { headers: headers(token) }
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub GET ${filePath}: ${res.status}`)
  const data = await res.json()
  if (Array.isArray(data)) throw new Error(`Expected file at ${filePath}, got directory listing`)
  return {
    content: Buffer.from(data.content as string, 'base64').toString('utf-8'),
    sha: data.sha as string,
  }
}

async function ghPut(filePath: string, content: string, message: string): Promise<void> {
  const { token, owner, repo, branch } = cfg()
  const existing = await ghGet(filePath)
  const body: Record<string, string> = {
    message,
    content: Buffer.from(content, 'utf-8').toString('base64'),
    branch,
  }
  if (existing) body.sha = existing.sha
  const res = await fetch(
    `${API}/repos/${owner}/${repo}/contents/${repoPath(filePath)}`,
    { method: 'PUT', headers: headers(token), body: JSON.stringify(body) }
  )
  if (!res.ok) throw new Error(`GitHub PUT ${filePath}: ${res.status} ${await res.text()}`)
}

async function ghDelete(filePath: string, message: string): Promise<void> {
  const { token, owner, repo, branch } = cfg()
  const existing = await ghGet(filePath)
  if (!existing) return
  const res = await fetch(
    `${API}/repos/${owner}/${repo}/contents/${repoPath(filePath)}`,
    {
      method: 'DELETE',
      headers: headers(token),
      body: JSON.stringify({ message, sha: existing.sha, branch }),
    }
  )
  if (!res.ok && res.status !== 404) throw new Error(`GitHub DELETE ${filePath}: ${res.status}`)
}

async function ghList(dirPath: string): Promise<Array<{ name: string; type: string }>> {
  const { token, owner, repo, branch } = cfg()
  const res = await fetch(
    `${API}/repos/${owner}/${repo}/contents/${repoPath(dirPath)}?ref=${encodeURIComponent(branch)}`,
    { headers: headers(token) }
  )
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`GitHub LIST ${dirPath}: ${res.status}`)
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

// ─── Pure helpers (mirrors storage.ts) ───────────────────────────────────────

function buildFileMeta(filename: string, content: string, lastModified: string): LibraryFileMeta {
  const lines = content.split('\n')
  const h1Line = lines.find(l => l.startsWith('# '))
  const title = h1Line ? h1Line.replace(/^#\s+/, '').trim() : filename.replace(/\.md$/, '')
  const words = content.split(/\s+/).filter(Boolean).length
  const tags = lines
    .filter(l => l.startsWith('## '))
    .map(l => l.replace(/^##\s+/, '').trim().toLowerCase())
    .slice(0, 8)
  return { filename, title, wordCount: words, charCount: content.length, tags, lastModified }
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

// ─── Participant ──────────────────────────────────────────────────────────────

export async function getParticipant(id: string): Promise<Participant | null> {
  const file = await ghGet(`participants/${id}/profile.json`)
  if (!file) return null
  try { return JSON.parse(file.content) as Participant } catch { return null }
}

export async function getAllParticipants(): Promise<Participant[]> {
  const entries = await ghList('participants')
  const dirs = entries.filter(e => e.type === 'dir')
  const results = await Promise.all(dirs.map(e => getParticipant(e.name)))
  return results.filter((p): p is Participant => p !== null)
}

export async function saveParticipant(participant: Participant): Promise<void> {
  await ghPut(
    `participants/${participant.id}/profile.json`,
    JSON.stringify(participant, null, 2),
    `chore: update participant ${participant.id}`
  )
}

export async function deleteParticipant(id: string): Promise<void> {
  const libEntries = await ghList(`participants/${id}/library`)
  await Promise.all(
    libEntries
      .filter(e => e.type === 'file')
      .map(e => ghDelete(`participants/${id}/library/${e.name}`, `chore: remove participant ${id}`))
  )
  await ghDelete(`participants/${id}/profile.json`, `chore: remove participant ${id}`)
}

// ─── Library ──────────────────────────────────────────────────────────────────

export async function getLibraryMeta(participantId: string): Promise<LibraryMeta> {
  const files = await getAllLibraryFiles(participantId)
  const metas = files.map(f => f.meta)
  return {
    participantId,
    fileCount: metas.length,
    totalChars: metas.reduce((sum, m) => sum + m.charCount, 0),
    hasReadme: metas.some(m => m.filename === 'README.md'),
    files: metas,
    lastUpdated: new Date().toISOString(),
  }
}

export async function getLibraryFile(participantId: string, filename: string): Promise<LibraryFile | null> {
  const file = await ghGet(`participants/${participantId}/library/${filename}`)
  if (!file) return null
  const meta = buildFileMeta(filename, file.content, new Date().toISOString())
  return { participantId, filename, content: file.content, meta }
}

export async function getAllLibraryFiles(participantId: string): Promise<LibraryFile[]> {
  const entries = await ghList(`participants/${participantId}/library`)
  const mdFiles = entries.filter(e => e.type === 'file' && e.name.endsWith('.md'))
  const files = await Promise.all(mdFiles.map(e => getLibraryFile(participantId, e.name)))
  return files.filter((f): f is LibraryFile => f !== null)
}

export async function saveLibraryFile(
  participantId: string,
  filename: string,
  content: string
): Promise<LibraryFileMeta> {
  await ghPut(
    `participants/${participantId}/library/${filename}`,
    content,
    `docs: upload ${filename} for ${participantId}`
  )
  return buildFileMeta(filename, content, new Date().toISOString())
}

export async function deleteLibraryFile(participantId: string, filename: string): Promise<void> {
  await ghDelete(
    `participants/${participantId}/library/${filename}`,
    `chore: remove ${filename} from ${participantId}`
  )
}

export async function extractLibraryExcerpts(
  participantId: string,
  config: ComparisonConfig
): Promise<LibraryFile[]> {
  const allFiles = await getAllLibraryFiles(participantId)
  const maxChars = config.maxCharsPerParticipant

  const readme = allFiles.find(f => f.filename === 'README.md')
  let selected: LibraryFile[] = readme ? [readme] : []
  const rest = allFiles.filter(f => f.filename !== 'README.md')

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
      candidates = rest.filter(f => f.meta.tags.some(t => requiredTags.includes(t)))
      break
    }
    default:
      candidates = rest
  }

  let charBudget = maxChars - (readme?.content.length ?? 0)
  if (charBudget <= 0) {
    if (readme) return [{ ...readme, content: readme.content.slice(0, maxChars) }]
    return []
  }

  switch (config.excerptStrategy) {
    case 'heading-sample':
      for (const file of candidates) {
        const excerpt = headingSample(file.content, Math.min(charBudget, 3000))
        if (!excerpt.length) continue
        selected.push({ ...file, content: excerpt })
        charBudget -= excerpt.length
        if (charBudget <= 0) break
      }
      break
    case 'random-n':
      for (const file of shuffled(candidates)) {
        const excerpt = randomParagraphSample(file.content, Math.min(charBudget, 3000))
        if (!excerpt.length) continue
        selected.push({ ...file, content: excerpt })
        charBudget -= excerpt.length
        if (charBudget <= 0) break
      }
      break
    default:
      for (const file of candidates) {
        const excerpt = file.content.slice(0, Math.min(charBudget, 3000))
        selected.push({ ...file, content: excerpt })
        charBudget -= excerpt.length
        if (charBudget <= 0) break
      }
  }

  return selected
}

// ─── Findings ─────────────────────────────────────────────────────────────────

export async function saveFinding(finding: ResonanceFinding): Promise<void> {
  await ghPut(
    `findings/${finding.id}.json`,
    JSON.stringify(finding, null, 2),
    `chore: save finding ${finding.id}`
  )
}

export async function getFinding(id: string): Promise<ResonanceFinding | null> {
  const file = await ghGet(`findings/${id}.json`)
  if (!file) return null
  try { return JSON.parse(file.content) as ResonanceFinding } catch { return null }
}

export async function getAllFindings(filters?: FindingFilters): Promise<ResonanceFinding[]> {
  const entries = await ghList('findings')
  const jsonFiles = entries.filter(e => e.type === 'file' && e.name.endsWith('.json'))
  const all = await Promise.all(jsonFiles.map(e => getFinding(e.name.replace('.json', ''))))
  let findings = all.filter((f): f is ResonanceFinding => f !== null)

  if (filters?.participantId) findings = findings.filter(f => f.participantIds.includes(filters.participantId!))
  if (filters?.logicSpaceId) findings = findings.filter(f => f.logicSpaceId === filters.logicSpaceId)
  if (filters?.type) findings = findings.filter(f => f.type === filters.type)
  if (filters?.minScore !== undefined) findings = findings.filter(f => f.score >= filters.minScore!)

  findings.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  if (filters?.limit) findings = findings.slice(0, filters.limit)

  return findings
}

export async function updateFindingStatus(
  findingId: string,
  participantId: string,
  status: ResonanceFinding['statusA']
): Promise<void> {
  const finding = await getFinding(findingId)
  if (!finding) return
  if (finding.participantIds[0] === participantId) finding.statusA = status
  else if (finding.participantIds[1] === participantId) finding.statusB = status
  await saveFinding(finding)
}

// ─── Logic Spaces ─────────────────────────────────────────────────────────────

export async function saveLogicSpace(space: LogicSpace): Promise<void> {
  await ghPut(
    `logic-spaces/${space.id}.json`,
    JSON.stringify(space, null, 2),
    `chore: save logic-space ${space.id}`
  )
}

export async function getLogicSpace(id: string): Promise<LogicSpace | null> {
  const file = await ghGet(`logic-spaces/${id}.json`)
  if (!file) return null
  try { return JSON.parse(file.content) as LogicSpace } catch { return null }
}

export async function getAllLogicSpaces(): Promise<LogicSpace[]> {
  const entries = await ghList('logic-spaces')
  const all = await Promise.all(
    entries
      .filter(e => e.type === 'file' && e.name.endsWith('.json'))
      .map(e => getLogicSpace(e.name.replace('.json', '')))
  )
  return all.filter((s): s is LogicSpace => s !== null)
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function saveNotification(notification: Notification): Promise<void> {
  await ghPut(
    `notifications/${notification.id}.json`,
    JSON.stringify(notification, null, 2),
    `chore: save notification ${notification.id}`
  )
}
