'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Participant, LibraryFileMeta } from '@/types/orbitalfork'

type Step = 'identity' | 'readme' | 'library' | 'done'

export default function OnboardPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('identity')
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<LibraryFileMeta[]>([])

  // Step 1: Identity form state
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')
  const [researchFocus, setResearchFocus] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleIdentitySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, email, bio, researchFocus }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Registration failed')
        setSubmitting(false)
        return
      }

      const p: Participant = await res.json()
      setParticipant(p)
      setStep('readme')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error — is the server running?')
    } finally {
      setSubmitting(false)
    }
  }

  const uploadFile = useCallback(async (file: File) => {
    if (!participant) return
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`/api/participants/${participant.id}/library`, {
      method: 'POST',
      body: formData,
    })
    if (res.ok) {
      const meta: LibraryFileMeta = await res.json()
      setUploadedFiles(prev => [...prev.filter(f => f.filename !== meta.filename), meta])
    }
  }, [participant])

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.md'))
    for (const file of files) await uploadFile(file)
  }, [uploadFile])

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(f => f.name.endsWith('.md'))
    for (const file of files) await uploadFile(file)
    e.target.value = ''
  }, [uploadFile])

  const hasReadme = uploadedFiles.some(f => f.filename === 'README.md')

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Title */}
        <div className="mb-8">
          <div className="text-[10px] uppercase tracking-widest text-field-dim mb-1">orbitalfork</div>
          <h1 className="text-lg font-light text-field-text">Register as a participant</h1>
          <p className="text-xs text-field-muted mt-1">
            Your research library defines your presence in the field. Other participants will discover resonance with your work.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2 mb-6">
          {(['identity', 'readme', 'library', 'done'] as Step[]).map((s, i) => (
            <div
              key={s}
              className="flex-1 h-0.5"
              style={{ background: ['identity', 'readme', 'library', 'done'].indexOf(step) >= i ? '#888' : '#222' }}
            />
          ))}
        </div>

        {/* Step 1: Identity */}
        {step === 'identity' && (
          <form onSubmit={handleIdentitySubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-field-dim mb-1">Name</label>
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
                className="w-full bg-transparent border border-field-border px-3 py-2 text-sm text-field-text focus:border-field-muted outline-none"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-field-dim mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-transparent border border-field-border px-3 py-2 text-sm text-field-text focus:border-field-muted outline-none"
                placeholder="you@example.com"
              />
              <div className="text-[10px] text-field-dim mt-1">For resonance notifications — never shared.</div>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-field-dim mb-1">About you <span className="text-field-dim normal-case">(optional — can be auto-extracted from README)</span></label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={3}
                className="w-full bg-transparent border border-field-border px-3 py-2 text-sm text-field-text focus:border-field-muted outline-none resize-none"
                placeholder="Who are you as a researcher?"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-field-dim mb-1">Research focus <span className="text-field-dim normal-case">(optional)</span></label>
              <textarea
                value={researchFocus}
                onChange={e => setResearchFocus(e.target.value)}
                rows={2}
                className="w-full bg-transparent border border-field-border px-3 py-2 text-sm text-field-text focus:border-field-muted outline-none resize-none"
                placeholder="What are you working on?"
              />
            </div>
            {error && <div className="text-[11px] text-red-400 border border-red-900 px-3 py-2">{error}</div>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full border border-field-border py-2 text-sm text-field-muted hover:text-field-text hover:border-field-muted disabled:opacity-40 transition-colors"
            >
              {submitting ? 'registering...' : 'continue'}
            </button>
          </form>
        )}

        {/* Step 2: README upload */}
        {step === 'readme' && participant && (
          <div className="space-y-4">
            <div>
              <div className="text-sm text-field-text mb-1">Upload your README.md</div>
              <p className="text-xs text-field-muted leading-relaxed">
                Your README is your research identity document. Write it in markdown. Include your background, current questions, methodological commitments, what you&apos;re working on.
                The bridging engine will use this to find resonance with other participants.
              </p>
            </div>

            <div
              onDragOver={e => e.preventDefault()}
              onDrop={async e => {
                e.preventDefault()
                const files = Array.from(e.dataTransfer.files).filter(f => f.name === 'README.md')
                if (files.length === 0) {
                  const anyMd = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.md'))
                  if (anyMd.length > 0) {
                    // Rename to README.md
                    const renamed = new File([anyMd[0]], 'README.md', { type: anyMd[0].type })
                    await uploadFile(renamed)
                  }
                } else {
                  await uploadFile(files[0])
                }
              }}
              className="border-2 border-dashed border-field-border p-8 text-center"
            >
              {hasReadme ? (
                <div className="text-sm text-field-text">README.md uploaded</div>
              ) : (
                <>
                  <div className="text-field-muted text-sm mb-2">Drop README.md here</div>
                  <label className="cursor-pointer border border-field-border px-4 py-2 text-xs text-field-muted hover:text-field-text transition-colors">
                    Browse
                    <input type="file" accept=".md" onChange={async e => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const renamed = new File([file], 'README.md', { type: file.type })
                      await uploadFile(renamed)
                      e.target.value = ''
                    }} className="hidden" />
                  </label>
                </>
              )}
            </div>

            <div className="text-[10px] text-field-dim">
              Don&apos;t have one yet? You can write it inline — just paste markdown in a text file named README.md.
              You can also update it later from your participant page.
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep('library')}
                disabled={!hasReadme}
                className="flex-1 border border-field-border py-2 text-sm text-field-muted hover:text-field-text hover:border-field-muted disabled:opacity-40 transition-colors"
              >
                continue
              </button>
              {!hasReadme && (
                <button
                  onClick={() => setStep('library')}
                  className="text-xs text-field-dim hover:text-field-muted px-3"
                >
                  skip for now
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Additional library files */}
        {step === 'library' && participant && (
          <div className="space-y-4">
            <div>
              <div className="text-sm text-field-text mb-1">Add research files <span className="text-field-dim text-xs">(optional)</span></div>
              <p className="text-xs text-field-muted leading-relaxed">
                Add any markdown files that represent your active thinking — notes, essays, drafts, reading notes, research logs.
                The bridging engine will search across all of them.
              </p>
            </div>

            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleFileDrop}
              className="border-2 border-dashed border-field-border p-6 text-center"
            >
              <div className="text-field-muted text-sm mb-2">Drop .md files here</div>
              <label className="cursor-pointer border border-field-border px-4 py-2 text-xs text-field-muted hover:text-field-text transition-colors">
                Browse
                <input type="file" accept=".md" multiple onChange={handleFileInput} className="hidden" />
              </label>
            </div>

            {uploadedFiles.filter(f => f.filename !== 'README.md').length > 0 && (
              <div className="space-y-1">
                {uploadedFiles.filter(f => f.filename !== 'README.md').map(f => (
                  <div key={f.filename} className="flex items-center gap-2 text-xs text-field-muted">
                    <span>✓</span>
                    <span>{f.title}</span>
                    <span className="text-field-dim">({f.wordCount} words)</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setStep('done')}
              className="w-full border border-field-border py-2 text-sm text-field-muted hover:text-field-text hover:border-field-muted transition-colors"
            >
              {uploadedFiles.length > 1 ? 'continue to field' : 'skip and enter field'}
            </button>
          </div>
        )}

        {/* Done */}
        {step === 'done' && participant && (
          <div className="space-y-4 text-center">
            <div className="text-4xl" style={{ color: participant.visual.color }}>
              {participant.visual.glyph}
            </div>
            <div className="text-sm text-field-text">{participant.displayName}</div>
            <div className="text-xs text-field-muted">
              You are now in the field. Resonance will be found when the bridge runs.
            </div>
            <div className="space-y-2 mt-4">
              <button
                onClick={() => router.push('/field')}
                className="w-full border border-field-border py-2 text-sm text-field-muted hover:text-field-text hover:border-field-muted transition-colors"
              >
                enter the field
              </button>
              <button
                onClick={() => router.push(`/participants/${participant.id}`)}
                className="w-full py-2 text-xs text-field-dim hover:text-field-muted transition-colors"
              >
                manage your profile
              </button>
            </div>
            <div className="text-[10px] text-field-dim border border-field-border p-3 text-left">
              <div className="mb-1">Your participant link (save this):</div>
              <div className="text-field-muted break-all">
                {process.env.NEXT_PUBLIC_APP_URL ?? ''}/participants/{participant.id}?token={participant.token}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
