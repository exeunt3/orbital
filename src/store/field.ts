'use client'

import { create } from 'zustand'
import type {
  Participant,
  ResonanceFinding,
  LogicSpace,
  BridgingRun,
  FieldPhase,
  FindingFilters,
} from '@/types/orbitalfork'

interface FieldStore {
  participants: Participant[]
  findings: ResonanceFinding[]
  logicSpaces: LogicSpace[]
  activeFinding: ResonanceFinding | null
  activeRun: BridgingRun | null
  phase: FieldPhase
  currentParticipantId: string | null

  loadParticipants: () => Promise<void>
  loadFindings: (filters?: FindingFilters) => Promise<void>
  loadLogicSpaces: () => Promise<void>
  setActiveFinding: (finding: ResonanceFinding | null) => void
  setCurrentParticipant: (id: string | null) => void
  setPhase: (phase: FieldPhase) => void
  setActiveRun: (run: BridgingRun | null) => void
  markFindingAsSeen: (findingId: string, participantId: string) => Promise<void>

  runBridgeBatch: (logicSpaceId: string) => Promise<void>
}

export const useFieldStore = create<FieldStore>((set, get) => ({
  participants: [],
  findings: [],
  logicSpaces: [],
  activeFinding: null,
  activeRun: null,
  phase: 'idle',
  currentParticipantId: null,

  loadParticipants: async () => {
    const res = await fetch('/api/participants')
    if (res.ok) {
      const participants = await res.json()
      set({ participants, phase: 'ready' })
    }
  },

  loadFindings: async (filters?: FindingFilters) => {
    const params = new URLSearchParams()
    if (filters?.participantId) params.set('participantId', filters.participantId)
    if (filters?.logicSpaceId) params.set('logicSpaceId', filters.logicSpaceId)
    if (filters?.type) params.set('type', filters.type)
    if (filters?.minScore !== undefined) params.set('minScore', String(filters.minScore))
    if (filters?.limit) params.set('limit', String(filters.limit))

    const res = await fetch(`/api/findings?${params.toString()}`)
    if (res.ok) {
      const findings = await res.json()
      set({ findings })
    }
  },

  loadLogicSpaces: async () => {
    const res = await fetch('/api/logic-spaces')
    if (res.ok) {
      const logicSpaces = await res.json()
      set({ logicSpaces })
    }
  },

  setActiveFinding: (finding) => set({ activeFinding: finding, phase: finding ? 'displaying-finding' : 'ready' }),
  setCurrentParticipant: (id) => set({ currentParticipantId: id }),
  setPhase: (phase) => set({ phase }),
  setActiveRun: (run) => set({ activeRun: run }),

  markFindingAsSeen: async (findingId, participantId) => {
    await fetch(`/api/findings/${findingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId, status: 'seen' }),
    })
    // Update local state
    set(state => ({
      findings: state.findings.map(f => {
        if (f.id !== findingId) return f
        const idx = f.participantIds.indexOf(participantId)
        if (idx === 0) return { ...f, statusA: 'seen' as const }
        if (idx === 1) return { ...f, statusB: 'seen' as const }
        return f
      }),
    }))
  },

  runBridgeBatch: async (logicSpaceId) => {
    set({ phase: 'bridging' })
    try {
      const res = await fetch('/api/bridge/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logicSpaceId }),
      })
      if (res.ok) {
        const { run, findings: newFindings } = await res.json()
        set(state => ({
          findings: [...newFindings, ...state.findings],
          activeRun: run,
          phase: 'ready',
        }))
      }
    } catch {
      set({ phase: 'error' })
    }
  },
}))
