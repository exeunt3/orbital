'use client'

import { useState } from 'react'
import type { ResonanceFinding, Participant, BridgingRun } from '@/types/orbitalfork'
import FindingCard from './FindingCard'

interface ResonancePanelProps {
  findings: ResonanceFinding[]
  participants: Participant[]
  activeFinding: ResonanceFinding | null
  activeRun: BridgingRun | null
  currentParticipantId: string | null
  onSelectFinding: (finding: ResonanceFinding | null) => void
}

export default function ResonancePanel({
  findings,
  participants,
  activeFinding,
  activeRun,
  currentParticipantId,
  onSelectFinding,
}: ResonancePanelProps) {
  const [showLog, setShowLog] = useState(false)

  const displayed = currentParticipantId
    ? findings.filter(f => f.participantIds.includes(currentParticipantId))
    : findings

  if (activeFinding) {
    return <FindingDetail finding={activeFinding} participants={participants} onClose={() => onSelectFinding(null)} />
  }

  return (
    <div className="h-full flex flex-col" style={{ background: '#040404' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-field-border flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-field-muted">
            {currentParticipantId
              ? `${participants.find(p => p.id === currentParticipantId)?.displayName ?? 'Unknown'}'s findings`
              : 'Recent findings'}
          </div>
          <div className="text-[11px] text-field-dim mt-0.5">{displayed.length} total</div>
        </div>
        {activeRun && (
          <button
            onClick={() => setShowLog(v => !v)}
            className="text-[10px] text-field-dim hover:text-field-muted"
          >
            {showLog ? 'hide log' : 'show log'}
          </button>
        )}
      </div>

      {/* Bridge run log */}
      {activeRun && showLog && (
        <div className="border-b border-field-border p-3 max-h-32 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-widest text-field-dim mb-1">
            Run log — {activeRun.status}
          </div>
          {activeRun.log.map((line, i) => (
            <div key={i} className="text-[10px] text-field-muted leading-relaxed">{line}</div>
          ))}
        </div>
      )}

      {/* Findings list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {displayed.length === 0 && (
          <div className="text-[11px] text-field-dim py-4 text-center">
            No findings yet.
            <br />
            <span className="text-[10px]">Run bridging to discover resonance.</span>
          </div>
        )}
        {displayed.map(f => (
          <FindingCard
            key={f.id}
            finding={f}
            participants={participants}
            onClick={() => onSelectFinding(f)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Full finding detail view ─────────────────────────────────────────────────

function FindingDetail({
  finding,
  participants,
  onClose,
}: {
  finding: ResonanceFinding
  participants: Participant[]
  onClose: () => void
}) {
  const pA = participants.find(p => p.id === finding.participantIds[0])
  const pB = participants.find(p => p.id === finding.participantIds[1])
  const scorePercent = Math.round(finding.score * 100)

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: '#040404' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-field-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          {pA && <span className="text-xs" style={{ color: pA.visual.color }}>{pA.visual.glyph} {pA.displayName}</span>}
          <span className="text-field-dim text-xs">×</span>
          {pB && <span className="text-xs" style={{ color: pB.visual.color }}>{pB.visual.glyph} {pB.displayName}</span>}
        </div>
        <button onClick={onClose} className="text-field-dim hover:text-field-muted text-[11px]">
          close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Score + type */}
        <div className="flex items-center gap-3">
          <div className="text-lg font-light text-field-text">{scorePercent}%</div>
          <div className="text-[11px] uppercase tracking-wider text-field-muted">{finding.type}</div>
          <div className="flex-1 h-px bg-field-border relative">
            <div
              className="absolute top-0 left-0 h-full bg-white opacity-30"
              style={{ width: `${scorePercent}%` }}
            />
          </div>
        </div>

        {/* Summary */}
        <div>
          <div className="text-[10px] uppercase tracking-widest text-field-dim mb-1">What was found</div>
          <p className="text-xs text-field-muted leading-relaxed">{finding.bridgingSummary}</p>
        </div>

        {/* Contact points */}
        {finding.contactPoints.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-widest text-field-dim mb-2">Contact points</div>
            <div className="space-y-3">
              {finding.contactPoints
                .sort((a, b) => b.resonanceScore - a.resonanceScore)
                .map((cp, i) => (
                  <div key={i} className="border border-field-border p-3" style={{ background: '#060606' }}>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div>
                        {pA && <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: pA.visual.color }}>{pA.displayName}</div>}
                        <p className="text-[11px] text-field-muted italic leading-relaxed">&ldquo;{cp.excerptA}&rdquo;</p>
                      </div>
                      <div>
                        {pB && <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: pB.visual.color }}>{pB.displayName}</div>}
                        <p className="text-[11px] text-field-muted italic leading-relaxed">&ldquo;{cp.excerptB}&rdquo;</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-field-dim border-t border-field-border pt-2">{cp.connectionDescription}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Inquiry */}
        <div className="border border-field-border p-3" style={{ background: '#080808' }}>
          <div className="text-[10px] uppercase tracking-widest text-field-dim mb-2">A question for both of you</div>
          <p className="text-xs text-field-text leading-relaxed italic">{finding.suggestedInquiry}</p>
        </div>

        {/* Tension (for contrast/friction) */}
        {finding.tension && (
          <div>
            <div className="text-[10px] uppercase tracking-widest text-field-dim mb-2">The tension</div>
            <div className="space-y-2">
              <div className="border-l-2 pl-2" style={{ borderColor: pA?.visual.color ?? '#444' }}>
                <div className="text-[9px] uppercase tracking-wider text-field-dim mb-0.5">
                  {pA?.displayName}
                </div>
                <p className="text-[11px] text-field-muted">{finding.tension.positionA}</p>
              </div>
              <div className="px-2 py-2 border border-field-dim text-[11px] text-field-muted text-center">
                {finding.tension.cruxStatement}
              </div>
              <div className="border-l-2 pl-2" style={{ borderColor: pB?.visual.color ?? '#444' }}>
                <div className="text-[9px] uppercase tracking-wider text-field-dim mb-0.5">
                  {pB?.displayName}
                </div>
                <p className="text-[11px] text-field-muted">{finding.tension.positionB}</p>
              </div>
            </div>
          </div>
        )}

        <div className="text-[10px] text-field-dim pt-2 border-t border-field-border">
          {new Date(finding.createdAt).toLocaleString()}
          {' · '}
          <a
            href={`/findings/${finding.id}`}
            className="hover:text-field-muted"
            target="_blank"
            rel="noreferrer"
          >
            permalink
          </a>
        </div>
      </div>
    </div>
  )
}
