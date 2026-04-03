'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { ResonanceFinding, Participant } from '@/types/orbitalfork'

const TYPE_COLORS: Record<string, string> = {
  resonance: '#90c8a0',
  contrast: '#c89090',
  echo: '#90b8c8',
  friction: '#c8a890',
  convergence: '#b8c890',
}

export default function FindingDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params.id as string
  const participantId = searchParams.get('participantId')
  const token = searchParams.get('token')
  const ackDone = searchParams.get('ack') === '1'

  const [finding, setFinding] = useState<ResonanceFinding | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/findings/${id}`).then(r => r.ok ? r.json() : null),
      fetch('/api/participants').then(r => r.json()),
    ]).then(([f, p]) => {
      setFinding(f)
      setParticipants(p)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-field-dim text-sm">loading...</div>
  }

  if (!finding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-field-dim mb-2">Finding not found</div>
          <Link href="/findings" className="text-xs text-field-muted hover:text-field-text">Back to findings</Link>
        </div>
      </div>
    )
  }

  const pA = participants.find(p => p.id === finding.participantIds[0])
  const pB = participants.find(p => p.id === finding.participantIds[1])
  const scorePercent = Math.round(finding.score * 100)
  const typeColor = TYPE_COLORS[finding.type] ?? '#888'

  const currentParticipant = participantId ? participants.find(p => p.id === participantId) : null
  const otherParticipant = currentParticipant?.id === finding.participantIds[0] ? pB : pA

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="text-[10px] uppercase tracking-widest text-field-dim mb-6">
        <Link href="/field" className="hover:text-field-muted">field</Link>
        {' / '}
        <Link href="/findings" className="hover:text-field-muted">findings</Link>
        {' / '}
        {finding.id.slice(0, 8)}
      </div>

      {ackDone && (
        <div className="mb-4 border border-field-border px-4 py-3 text-xs text-field-muted">
          Finding acknowledged.
        </div>
      )}

      {/* Header: participants */}
      <div className="flex items-center gap-4 mb-6">
        {pA && (
          <div className="flex items-center gap-2">
            <span className="text-3xl" style={{ color: pA.visual.color }}>{pA.visual.glyph}</span>
            <div>
              <div className="text-sm text-field-text">{pA.displayName}</div>
              <div className="text-[10px] text-field-dim">files: {finding.filesA.join(', ')}</div>
            </div>
          </div>
        )}
        <div className="flex-1 text-center">
          <div className="text-lg font-light" style={{ color: typeColor }}>{scorePercent}%</div>
          <div className="text-[10px] uppercase tracking-wider text-field-dim">{finding.type}</div>
          <div className="mt-1 h-px relative" style={{ background: '#222' }}>
            <div className="absolute top-0 left-0 h-full" style={{ width: `${scorePercent}%`, background: typeColor, opacity: 0.5 }} />
          </div>
        </div>
        {pB && (
          <div className="flex items-center gap-2 text-right">
            <div>
              <div className="text-sm text-field-text">{pB.displayName}</div>
              <div className="text-[10px] text-field-dim">files: {finding.filesB.join(', ')}</div>
            </div>
            <span className="text-3xl" style={{ color: pB.visual.color }}>{pB.visual.glyph}</span>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-widest text-field-dim mb-2">What was found</div>
        <p className="text-sm text-field-muted leading-relaxed">{finding.bridgingSummary}</p>
      </div>

      {/* Contact points */}
      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-widest text-field-dim mb-3">
          Contact points ({finding.contactPoints.length})
        </div>
        <div className="space-y-4">
          {finding.contactPoints
            .sort((a, b) => b.resonanceScore - a.resonanceScore)
            .map((cp, i) => (
              <div key={i} className="border border-field-border p-4" style={{ background: '#060606' }}>
                <div className="text-[10px] uppercase tracking-wider text-field-dim mb-3">
                  {cp.connectionType} · {Math.round(cp.resonanceScore * 100)}%
                </div>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    {pA && <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: pA.visual.color }}>{pA.displayName}</div>}
                    <p className="text-xs text-field-muted italic leading-relaxed">&ldquo;{cp.excerptA}&rdquo;</p>
                  </div>
                  <div>
                    {pB && <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: pB.visual.color }}>{pB.displayName}</div>}
                    <p className="text-xs text-field-muted italic leading-relaxed">&ldquo;{cp.excerptB}&rdquo;</p>
                  </div>
                </div>
                <p className="text-[11px] text-field-dim border-t border-field-border pt-2">{cp.connectionDescription}</p>
              </div>
            ))}
        </div>
      </div>

      {/* Inquiry */}
      <div className="mb-6 border border-field-border p-4" style={{ background: '#080808' }}>
        <div className="text-[10px] uppercase tracking-widest text-field-dim mb-2">A question for both of you</div>
        <p className="text-sm text-field-text italic leading-relaxed">{finding.suggestedInquiry}</p>
      </div>

      {/* Tension */}
      {finding.tension && (
        <div className="mb-6">
          <div className="text-[10px] uppercase tracking-widest text-field-dim mb-3">The tension</div>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="border-l-2 pl-3" style={{ borderColor: pA?.visual.color ?? '#444' }}>
              {pA && <div className="text-[9px] uppercase tracking-wider text-field-dim mb-1">{pA.displayName}</div>}
              <p className="text-xs text-field-muted leading-relaxed">{finding.tension.positionA}</p>
            </div>
            <div className="border-l-2 pl-3" style={{ borderColor: pB?.visual.color ?? '#444' }}>
              {pB && <div className="text-[9px] uppercase tracking-wider text-field-dim mb-1">{pB.displayName}</div>}
              <p className="text-xs text-field-muted leading-relaxed">{finding.tension.positionB}</p>
            </div>
          </div>
          <div className="border border-field-dim p-3 text-xs text-field-muted text-center">
            {finding.tension.cruxStatement}
          </div>
          {finding.tension.productiveQuestion && (
            <p className="text-xs text-field-dim mt-2 text-center italic">{finding.tension.productiveQuestion}</p>
          )}
        </div>
      )}

      {/* Actions */}
      {currentParticipant && otherParticipant && token && (
        <div className="border-t border-field-border pt-4 mt-4 flex gap-3">
          <a
            href={`/api/findings/${finding.id}/ack?participantId=${currentParticipant.id}&token=${token}`}
            className="border border-field-border px-4 py-2 text-xs text-field-muted hover:text-field-text hover:border-field-muted transition-colors"
          >
            Acknowledge
          </a>
        </div>
      )}

      <div className="text-[10px] text-field-dim mt-4">
        {new Date(finding.createdAt).toLocaleString()}
        {' · '}finding {finding.id.slice(0, 8)}
      </div>
    </div>
  )
}
