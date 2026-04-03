'use client'

import type { Participant, ResonanceFinding, LogicSpace } from '@/types/orbitalfork'

interface ParticipantPanelProps {
  participants: Participant[]
  findings: ResonanceFinding[]
  logicSpaces: LogicSpace[]
  currentParticipantId: string | null
  phase: string
  onParticipantSelect: (id: string | null) => void
  onRunBridge: (logicSpaceId: string) => void
}

export default function ParticipantPanel({
  participants,
  findings,
  logicSpaces,
  currentParticipantId,
  phase,
  onParticipantSelect,
  onRunBridge,
}: ParticipantPanelProps) {
  const isBridging = phase === 'bridging'

  const getUnreadCount = (participantId: string) => {
    return findings.filter(f => {
      const idx = f.participantIds.indexOf(participantId)
      if (idx === 0) return f.statusA === 'new'
      if (idx === 1) return f.statusB === 'new'
      return false
    }).length
  }

  const defaultSpace = logicSpaces.find(s => s.isActive) ?? logicSpaces[0]

  return (
    <div className="h-full flex flex-col border-r border-field-border" style={{ background: '#060606', width: 220 }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-field-border">
        <div className="text-[10px] uppercase tracking-widest text-field-muted mb-0.5">orbitalfork</div>
        <div className="text-xs text-field-text">research field</div>
      </div>

      {/* Participants */}
      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-3 mb-1 text-[10px] uppercase tracking-widest text-field-dim">
          Participants
        </div>
        {participants.length === 0 && (
          <div className="px-3 py-2 text-[11px] text-field-dim">
            No participants yet.{' '}
            <a href="/onboard" className="text-field-muted hover:text-field-text underline">
              Register
            </a>
          </div>
        )}
        {participants.map((p) => {
          const unread = getUnreadCount(p.id)
          const isSelected = p.id === currentParticipantId

          return (
            <div
              key={p.id}
              onClick={() => onParticipantSelect(isSelected ? null : p.id)}
              className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
              style={{
                background: isSelected ? '#111' : 'transparent',
                borderLeft: isSelected ? `2px solid ${p.visual.color}` : '2px solid transparent',
              }}
            >
              <span className="text-sm" style={{ color: p.visual.color }}>{p.visual.glyph}</span>
              <span className="text-xs text-field-text flex-1 truncate">{p.displayName}</span>
              {unread > 0 && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full text-black font-medium"
                  style={{ background: p.visual.color }}
                >
                  {unread}
                </span>
              )}
              {p.status === 'paused' && (
                <span className="text-[9px] text-field-dim">paused</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Logic spaces + bridge trigger */}
      <div className="border-t border-field-border p-3">
        <div className="text-[10px] uppercase tracking-widest text-field-dim mb-2">Bridge</div>

        {logicSpaces.length === 0 && (
          <div className="text-[11px] text-field-dim mb-2">No logic spaces configured.</div>
        )}

        {logicSpaces.slice(0, 3).map(space => (
          <div key={space.id} className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-field-muted truncate flex-1 mr-2">{space.name}</span>
            <button
              onClick={() => onRunBridge(space.id)}
              disabled={isBridging || participants.filter(p => p.status === 'active').length < 2}
              className="text-[10px] px-2 py-0.5 border border-field-border text-field-muted hover:text-field-text hover:border-field-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {isBridging ? '...' : 'run'}
            </button>
          </div>
        ))}

        {defaultSpace && (
          <button
            onClick={() => onRunBridge(defaultSpace.id)}
            disabled={isBridging || participants.filter(p => p.status === 'active').length < 2}
            className="w-full mt-2 py-1.5 text-[11px] border border-field-border text-field-muted hover:text-field-text hover:border-field-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {isBridging ? 'bridging...' : 'run bridge'}
          </button>
        )}

        <div className="mt-3 flex flex-col gap-1">
          <a href="/onboard" className="text-[10px] text-field-dim hover:text-field-muted">
            + register participant
          </a>
          <a href="/participants" className="text-[10px] text-field-dim hover:text-field-muted">
            manage participants
          </a>
          <a href="/findings" className="text-[10px] text-field-dim hover:text-field-muted">
            all findings
          </a>
        </div>
      </div>
    </div>
  )
}
