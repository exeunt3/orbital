'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { Participant, LibraryFileMeta } from '@/types/orbitalfork'
import LibraryUpload from '@/components/LibraryUpload'

export default function ParticipantPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params.id as string
  const token = searchParams.get('token')

  const [participant, setParticipant] = useState<Participant | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editBio, setEditBio] = useState('')
  const [editFocus, setEditFocus] = useState('')
  const [saving, setSaving] = useState(false)
  const [files, setFiles] = useState<LibraryFileMeta[]>([])

  const isOwner = token && participant?.token === token

  const load = useCallback(async () => {
    const res = await fetch(`/api/participants/${id}`)
    if (res.ok) {
      const p: Participant = await res.json()
      setParticipant(p)
      setEditBio(p.bio)
      setEditFocus(p.researchFocus)
      setFiles(p.libraryMeta.files)
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    setSaving(true)
    await fetch(`/api/participants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bio: editBio, researchFocus: editFocus }),
    })
    setSaving(false)
    setEditing(false)
    load()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-field-dim text-sm">
        loading...
      </div>
    )
  }

  if (!participant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-field-dim mb-2">Participant not found</div>
          <Link href="/participants" className="text-xs text-field-muted hover:text-field-text">
            Back to participants
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="text-[10px] uppercase tracking-widest text-field-dim mb-6">
        <Link href="/field" className="hover:text-field-muted">field</Link>
        {' / '}
        <Link href="/participants" className="hover:text-field-muted">participants</Link>
        {' / '}
        {participant.displayName}
      </div>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <span className="text-4xl" style={{ color: participant.visual.color }}>
          {participant.visual.glyph}
        </span>
        <div className="flex-1">
          <h1 className="text-xl font-light text-field-text">{participant.displayName}</h1>
          <div className="text-xs text-field-dim mt-0.5">
            {participant.status} · joined {new Date(participant.joinedAt).toLocaleDateString()}
          </div>
        </div>
        {isOwner && (
          <button
            onClick={() => setEditing(v => !v)}
            className="text-xs text-field-dim hover:text-field-muted border border-field-border px-3 py-1.5"
          >
            {editing ? 'cancel' : 'edit'}
          </button>
        )}
      </div>

      {/* Bio / focus */}
      {editing ? (
        <div className="space-y-3 mb-6">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-field-dim mb-1">About</label>
            <textarea
              value={editBio}
              onChange={e => setEditBio(e.target.value)}
              rows={4}
              className="w-full bg-transparent border border-field-border px-3 py-2 text-sm text-field-text focus:border-field-muted outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-field-dim mb-1">Research focus</label>
            <textarea
              value={editFocus}
              onChange={e => setEditFocus(e.target.value)}
              rows={2}
              className="w-full bg-transparent border border-field-border px-3 py-2 text-sm text-field-text focus:border-field-muted outline-none resize-none"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="border border-field-border px-4 py-2 text-xs text-field-muted hover:text-field-text disabled:opacity-40"
          >
            {saving ? 'saving...' : 'save'}
          </button>
        </div>
      ) : (
        <div className="mb-6 space-y-3">
          {participant.bio && (
            <p className="text-sm text-field-muted leading-relaxed">{participant.bio}</p>
          )}
          {participant.researchFocus && participant.researchFocus !== participant.bio && (
            <p className="text-xs text-field-dim leading-relaxed border-l border-field-border pl-3">
              {participant.researchFocus}
            </p>
          )}
        </div>
      )}

      {/* Library */}
      <div className="border-t border-field-border pt-6">
        <div className="text-[10px] uppercase tracking-widest text-field-dim mb-4">
          Research library
          <span className="ml-2 normal-case text-field-dim font-normal">
            {files.length} files
          </span>
        </div>

        {isOwner ? (
          <LibraryUpload
            participantId={id}
            existingFiles={files}
            onUploaded={(meta) => {
              setFiles(prev => [...prev.filter(f => f.filename !== meta.filename), meta])
            }}
          />
        ) : (
          <div className="space-y-1">
            {files.map(f => (
              <div key={f.filename} className="flex items-center gap-3 py-1.5 border-b border-field-border last:border-0">
                <div className="flex-1">
                  <div className="text-xs text-field-text">{f.title}</div>
                  <div className="text-[10px] text-field-dim">{f.wordCount.toLocaleString()} words</div>
                </div>
              </div>
            ))}
            {files.length === 0 && (
              <div className="text-xs text-field-dim">No files in library yet.</div>
            )}
          </div>
        )}
      </div>

      {/* Notification prefs (owner only) */}
      {isOwner && (
        <div className="border-t border-field-border pt-6 mt-6">
          <div className="text-[10px] uppercase tracking-widest text-field-dim mb-3">Notifications</div>
          <div className="flex items-center gap-3 text-xs text-field-muted">
            <span>Notify on resonance:</span>
            <button
              onClick={async () => {
                await fetch(`/api/participants/${id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ notifyOnResonance: !participant.notifyOnResonance }),
                })
                load()
              }}
              className="border border-field-border px-2 py-0.5 text-[11px] hover:border-field-muted"
            >
              {participant.notifyOnResonance ? 'on' : 'off'}
            </button>
            <span>Threshold:</span>
            <span>{Math.round(participant.resonanceThreshold * 100)}%</span>
          </div>
        </div>
      )}

      <div className="mt-6">
        <Link href="/findings" className="text-xs text-field-dim hover:text-field-muted">
          View all findings
        </Link>
      </div>
    </div>
  )
}
