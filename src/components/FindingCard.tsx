'use client'

import type { ResonanceFinding, Participant } from '@/types/orbitalfork'

interface FindingCardProps {
  finding: ResonanceFinding
  participants: Participant[]
  onClick?: () => void
  compact?: boolean
}

const FINDING_TYPE_COLOR: Record<string, string> = {
  resonance: '#90c8a0',
  contrast: '#c89090',
  echo: '#90b8c8',
  friction: '#c8a890',
  convergence: '#b8c890',
}

export default function FindingCard({ finding, participants, onClick, compact = false }: FindingCardProps) {
  const pA = participants.find(p => p.id === finding.participantIds[0])
  const pB = participants.find(p => p.id === finding.participantIds[1])
  const typeColor = FINDING_TYPE_COLOR[finding.type] ?? '#888'
  const scorePercent = Math.round(finding.score * 100)
  const topPoint = finding.contactPoints.sort((a, b) => b.resonanceScore - a.resonanceScore)[0]
  const isNew = finding.statusA === 'new' || finding.statusB === 'new'

  return (
    <div
      onClick={onClick}
      className="border border-field-border p-3 cursor-pointer hover:border-field-muted transition-colors"
      style={{ background: '#060606' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {pA && (
            <span className="text-xs" style={{ color: pA.visual.color }}>
              {pA.visual.glyph} {pA.displayName}
            </span>
          )}
          <span className="text-field-dim text-xs">×</span>
          {pB && (
            <span className="text-xs" style={{ color: pB.visual.color }}>
              {pB.visual.glyph} {pB.displayName}
            </span>
          )}
          {isNew && (
            <span className="w-1.5 h-1.5 rounded-full bg-white opacity-70 inline-block" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider" style={{ color: typeColor }}>
            {finding.type}
          </span>
          <span className="text-[10px] text-field-muted">{scorePercent}%</span>
        </div>
      </div>

      {/* Score bar */}
      <div className="h-px bg-field-border mb-3 relative">
        <div
          className="absolute top-0 left-0 h-full"
          style={{ width: `${scorePercent}%`, background: typeColor, opacity: 0.6 }}
        />
      </div>

      {!compact && (
        <>
          {/* Summary */}
          <p className="text-xs text-field-muted leading-relaxed mb-3 line-clamp-2">
            {finding.bridgingSummary}
          </p>

          {/* Top contact point */}
          {topPoint && (
            <div className="border-l border-field-dim pl-2 mb-3">
              <p className="text-[11px] text-field-muted italic line-clamp-1">
                &ldquo;{topPoint.excerptA}&rdquo;
              </p>
              <p className="text-[10px] text-field-dim mt-0.5 line-clamp-1">
                {topPoint.connectionDescription}
              </p>
            </div>
          )}

          {/* Inquiry */}
          <p className="text-[11px] text-field-text leading-relaxed border-t border-field-border pt-2 mt-2">
            {finding.suggestedInquiry}
          </p>
        </>
      )}

      {compact && (
        <p className="text-xs text-field-muted line-clamp-1">{finding.bridgingSummary}</p>
      )}

      <div className="text-[10px] text-field-dim mt-2">
        {new Date(finding.createdAt).toLocaleDateString()}
      </div>
    </div>
  )
}
