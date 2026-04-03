'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { ResonanceFinding, Participant } from '@/types/orbitalfork'
import FindingCard from '@/components/FindingCard'

export default function FindingsPage() {
  const [findings, setFindings] = useState<ResonanceFinding[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/findings').then(r => r.json()),
      fetch('/api/participants').then(r => r.json()),
    ]).then(([f, p]) => {
      setFindings(f)
      setParticipants(p)
      setLoading(false)
    })
  }, [])

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-widest text-field-dim mb-1">
          <Link href="/field" className="hover:text-field-muted">orbitalfork</Link>
          {' / '}findings
        </div>
        <h1 className="text-lg font-light text-field-text">All resonance findings</h1>
        <p className="text-xs text-field-muted mt-1">{findings.length} total</p>
      </div>

      {loading && (
        <div className="text-field-dim text-sm text-center py-8">loading...</div>
      )}

      {!loading && findings.length === 0 && (
        <div className="text-center py-12">
          <div className="text-field-dim text-sm mb-2">No findings yet.</div>
          <Link href="/field" className="text-xs text-field-muted hover:text-field-text">
            Run bridging from the field
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {findings.map(f => (
          <Link key={f.id} href={`/findings/${f.id}`}>
            <FindingCard finding={f} participants={participants} />
          </Link>
        ))}
      </div>
    </div>
  )
}
