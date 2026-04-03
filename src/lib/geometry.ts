// Pair selection per geometry type.
// Given participants and a LogicSpace, returns which pairs to bridge in this run.

import { areParticipantsProximate } from '@/engine/orbit'
import type { Participant, LogicSpace, ResonanceFinding } from '@/types/orbitalfork'

type Pair = [string, string]

export function computePairsForRun(
  participants: Participant[],
  logicSpace: LogicSpace,
  existingFindings: ResonanceFinding[],
  simTime: number
): Pair[] {
  const active = participants.filter(p => p.status === 'active')
  const included = logicSpace.participantIds.length > 0
    ? active.filter(p => logicSpace.participantIds.includes(p.id))
    : active

  if (included.length < 2) return []

  switch (logicSpace.geometry.type) {
    case 'orbital':
      return computeOrbitalPairs(included, logicSpace, simTime)
    case 'network':
      return computeNetworkPairs(included, logicSpace, existingFindings)
    case 'temporal':
      return computeTemporalPairs(included, logicSpace)
    case 'contrast':
      return computeContrastPairs(included, logicSpace)
    default:
      return computeAllPairs(included)
  }
}

function computeOrbitalPairs(
  participants: Participant[],
  logicSpace: LogicSpace,
  simTime: number
): Pair[] {
  const config = logicSpace.geometry.orbital
  const threshold = config?.proximityThreshold ?? 60
  const pairs: Pair[] = []

  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      const a = participants[i]
      const b = participants[j]
      if (areParticipantsProximate(a.orbitalParams, b.orbitalParams, simTime, threshold)) {
        pairs.push([a.id, b.id])
      }
    }
  }
  return pairs
}

function computeNetworkPairs(
  participants: Participant[],
  logicSpace: LogicSpace,
  existingFindings: ResonanceFinding[]
): Pair[] {
  const config = logicSpace.geometry.network
  const mode = config?.edgeWeightMode ?? 'finding-count'
  const minDistance = config?.encounterDistance ?? 1

  // Build adjacency weights
  const weights = new Map<string, number>()
  const key = (a: string, b: string) => [a, b].sort().join('::')

  for (const f of existingFindings) {
    const k = key(f.participantIds[0], f.participantIds[1])
    const current = weights.get(k) ?? 0
    if (mode === 'finding-count') {
      weights.set(k, current + 1)
    } else if (mode === 'average-score') {
      // Running average approximation
      weights.set(k, (current + f.score) / 2)
    } else {
      // recency-weighted: more recent findings count more
      const ageMs = Date.now() - new Date(f.createdAt).getTime()
      const ageDays = ageMs / (1000 * 60 * 60 * 24)
      const weight = Math.max(0, 1 - ageDays / 30) // decays to 0 after 30 days
      weights.set(k, current + weight)
    }
  }

  // Return pairs with fewer connections than the threshold (underexplored)
  const pairs: Pair[] = []
  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      const a = participants[i]
      const b = participants[j]
      const w = weights.get(key(a.id, b.id)) ?? 0
      if (w < minDistance) {
        pairs.push([a.id, b.id])
      }
    }
  }
  return pairs
}

function computeTemporalPairs(
  participants: Participant[],
  logicSpace: LogicSpace
): Pair[] {
  const config = logicSpace.geometry.temporal
  const windowDays = config?.windowDays ?? 30
  const mode = config?.alignmentMode ?? 'overlap'
  const windowMs = windowDays * 24 * 60 * 60 * 1000
  const now = Date.now()

  if (mode === 'overlap') {
    // Pair participants who were both active within the window
    const recent = participants.filter(p =>
      now - new Date(p.lastActiveAt).getTime() < windowMs
    )
    return computeAllPairs(recent)
  } else {
    // Sequential: sort by lastActiveAt, pair consecutive participants
    const sorted = [...participants].sort(
      (a, b) => new Date(a.lastActiveAt).getTime() - new Date(b.lastActiveAt).getTime()
    )
    const pairs: Pair[] = []
    for (let i = 0; i < sorted.length - 1; i++) {
      pairs.push([sorted[i].id, sorted[i + 1].id])
    }
    return pairs
  }
}

function computeContrastPairs(
  participants: Participant[],
  logicSpace: LogicSpace
): Pair[] {
  const config = logicSpace.geometry.contrast
  const threshold = config?.divergenceThreshold ?? 0.5
  const max = config?.maxPairsPerRun ?? 10

  // Compute rough keyword divergence from bio + researchFocus (no API cost)
  const tokenize = (text: string): Set<string> =>
    new Set(
      text
        .toLowerCase()
        .split(/\W+/)
        .filter(w => w.length > 4)
    )

  const tokens = participants.map(p => tokenize(`${p.bio} ${p.researchFocus}`))

  const scored: Array<{ pair: Pair; divergence: number }> = []
  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      const a = tokens[i]
      const b = tokens[j]
      const aArr = Array.from(a)
      const bArr = Array.from(b)
      const union = new Set([...aArr, ...bArr])
      const intersection = new Set(aArr.filter(t => b.has(t)))
      const jaccard = union.size > 0 ? intersection.size / union.size : 0
      const divergence = 1 - jaccard
      scored.push({ pair: [participants[i].id, participants[j].id], divergence })
    }
  }

  return scored
    .filter(s => s.divergence >= threshold)
    .sort((a, b) => b.divergence - a.divergence)
    .slice(0, max)
    .map(s => s.pair)
}

function computeAllPairs(participants: Participant[]): Pair[] {
  const pairs: Pair[] = []
  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      pairs.push([participants[i].id, participants[j].id])
    }
  }
  return pairs
}
