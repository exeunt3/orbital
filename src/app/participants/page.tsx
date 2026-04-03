import { getAllParticipants } from '@/lib/storage'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ParticipantsPage() {
  const participants = await getAllParticipants()
  const active = participants.filter(p => p.status === 'active')

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-field-dim mb-1">
            <Link href="/field" className="hover:text-field-muted">orbitalfork</Link>
            {' / '}participants
          </div>
          <h1 className="text-lg font-light text-field-text">Research field participants</h1>
          <p className="text-xs text-field-muted mt-1">{active.length} active</p>
        </div>
        <Link
          href="/onboard"
          className="border border-field-border px-3 py-1.5 text-xs text-field-muted hover:text-field-text hover:border-field-muted transition-colors"
        >
          + register
        </Link>
      </div>

      <div className="space-y-2">
        {participants.map(p => (
          <Link
            key={p.id}
            href={`/participants/${p.id}`}
            className="block border border-field-border p-4 hover:border-field-muted transition-colors"
            style={{ background: '#060606' }}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl" style={{ color: p.visual.color }}>{p.visual.glyph}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-field-text">{p.displayName}</span>
                  {p.status === 'paused' && (
                    <span className="text-[10px] text-field-dim border border-field-border px-1">paused</span>
                  )}
                </div>
                <p className="text-xs text-field-muted line-clamp-2 leading-relaxed">{p.researchFocus || p.bio}</p>
                <div className="text-[10px] text-field-dim mt-2">
                  {p.libraryMeta.fileCount} files
                  {!p.libraryMeta.hasReadme && (
                    <span className="ml-2 text-field-dim border border-field-dim px-1">no README</span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}

        {participants.length === 0 && (
          <div className="text-center py-12 text-field-dim">
            <p className="text-sm mb-2">No participants yet.</p>
            <Link href="/onboard" className="text-xs text-field-muted hover:text-field-text">
              Register the first participant
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
