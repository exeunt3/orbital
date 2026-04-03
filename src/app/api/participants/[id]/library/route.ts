import { NextRequest, NextResponse } from 'next/server'
import {
  getParticipant,
  saveParticipant,
  getLibraryMeta,
  saveLibraryFile,
  parseReadme,
} from '@/lib/storage'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const participant = await getParticipant(params.id)
  if (!participant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const meta = await getLibraryMeta(params.id)
  return NextResponse.json(meta)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const participant = await getParticipant(params.id)
  if (!participant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const contentType = req.headers.get('content-type') ?? ''

  let filename: string
  let content: string

  if (contentType.includes('application/json')) {
    const body = await req.json()
    filename = String(body.filename ?? '')
    content = String(body.content ?? '')
  } else if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    filename = file.name
    content = await file.text()
  } else {
    return NextResponse.json({ error: 'Unsupported content-type' }, { status: 415 })
  }

  if (!filename.endsWith('.md')) {
    return NextResponse.json({ error: 'Only .md files are accepted' }, { status: 400 })
  }

  const meta = await saveLibraryFile(params.id, filename, content)

  // If this is a README, update bio/researchFocus from it
  if (filename === 'README.md') {
    const { bio, researchFocus } = parseReadme(content)
    if (bio && !participant.bio) participant.bio = bio
    if (researchFocus && !participant.researchFocus) participant.researchFocus = researchFocus
  }

  participant.lastActiveAt = new Date().toISOString()
  await saveParticipant(participant)

  return NextResponse.json(meta, { status: 201 })
}
