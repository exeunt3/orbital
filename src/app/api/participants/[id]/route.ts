import { NextRequest, NextResponse } from 'next/server'
import { getParticipant, saveParticipant, deleteParticipant, getLibraryMeta } from '@/lib/storage'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const participant = await getParticipant(params.id)
  if (!participant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Refresh library meta on each GET
  const libraryMeta = await getLibraryMeta(params.id)
  return NextResponse.json({ ...participant, libraryMeta })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const participant = await getParticipant(params.id)
  if (!participant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const allowed = ['displayName', 'email', 'bio', 'researchFocus', 'status', 'notifyOnResonance', 'resonanceThreshold', 'visual', 'orbitalParams']

  for (const key of allowed) {
    if (key in body) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(participant as any)[key] = body[key]
    }
  }

  participant.lastActiveAt = new Date().toISOString()
  await saveParticipant(participant)
  return NextResponse.json(participant)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const participant = await getParticipant(params.id)
  if (!participant) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await deleteParticipant(params.id)
  return NextResponse.json({ success: true })
}
