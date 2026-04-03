'use client'

import { useCallback, useState } from 'react'
import type { LibraryFileMeta } from '@/types/orbitalfork'

interface LibraryUploadProps {
  participantId: string
  existingFiles: LibraryFileMeta[]
  onUploaded: (meta: LibraryFileMeta) => void
}

export default function LibraryUpload({ participantId, existingFiles, onUploaded }: LibraryUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const uploadFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.md')) {
      setError('Only .md files are accepted')
      return
    }

    const filename = file.name
    setUploading(prev => [...prev, filename])
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`/api/participants/${participantId}/library`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Upload failed')
        return
      }

      const meta: LibraryFileMeta = await res.json()
      onUploaded(meta)
    } catch {
      setError('Network error during upload')
    } finally {
      setUploading(prev => prev.filter(n => n !== filename))
    }
  }, [participantId, onUploaded])

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    for (const file of files) {
      await uploadFile(file)
    }
  }, [uploadFile])

  const onFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    for (const file of files) {
      await uploadFile(file)
    }
    e.target.value = ''
  }, [uploadFile])

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className="border-2 border-dashed p-8 text-center transition-colors"
        style={{
          borderColor: isDragging ? '#888' : '#333',
          background: isDragging ? '#0a0a0a' : 'transparent',
        }}
      >
        <div className="text-field-muted text-sm mb-2">
          Drop .md files here
        </div>
        <div className="text-field-dim text-xs mb-3">or</div>
        <label className="cursor-pointer border border-field-border px-4 py-2 text-xs text-field-muted hover:text-field-text hover:border-field-muted transition-colors">
          Browse files
          <input
            type="file"
            accept=".md"
            multiple
            onChange={onFileInput}
            className="hidden"
          />
        </label>
        <div className="text-[10px] text-field-dim mt-3">
          README.md required · any number of research .md files
        </div>
      </div>

      {error && (
        <div className="text-[11px] text-red-400 border border-red-900 px-3 py-2">{error}</div>
      )}

      {/* In-progress uploads */}
      {uploading.length > 0 && (
        <div className="space-y-1">
          {uploading.map(name => (
            <div key={name} className="text-[11px] text-field-muted flex items-center gap-2">
              <span className="animate-pulse">uploading</span>
              <span>{name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Existing files */}
      {existingFiles.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-field-dim mb-2">Library</div>
          <div className="space-y-1">
            {existingFiles.map(f => (
              <FileRow
                key={f.filename}
                file={f}
                participantId={participantId}
                canDelete={f.filename !== 'README.md'}
                onDeleted={() => {}}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function FileRow({
  file,
  participantId,
  canDelete,
  onDeleted,
}: {
  file: LibraryFileMeta
  participantId: string
  canDelete: boolean
  onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Delete ${file.filename}?`)) return
    setDeleting(true)
    await fetch(`/api/participants/${participantId}/library/${file.filename}`, { method: 'DELETE' })
    onDeleted()
    setDeleting(false)
  }

  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-field-border last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-xs text-field-text truncate">
          {file.filename === 'README.md' && <span className="text-field-muted mr-1">*</span>}
          {file.title}
        </div>
        <div className="text-[10px] text-field-dim">
          {file.wordCount.toLocaleString()} words
          {file.tags.length > 0 && ` · ${file.tags.slice(0, 3).join(', ')}`}
        </div>
      </div>
      {canDelete && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-[10px] text-field-dim hover:text-red-400 disabled:opacity-30"
        >
          {deleting ? '...' : 'delete'}
        </button>
      )}
    </div>
  )
}
