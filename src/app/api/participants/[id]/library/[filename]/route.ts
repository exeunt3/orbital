import { NextRequest, NextResponse } from 'next/server'
import { getParticipant, getLibraryFile, deleteLibraryFile, saveParticipant } from '@/lib/storage'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; filename: string } }
) {
  const file = await getLibraryFile(params.id, params.filename)
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(file)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; filename: string } }
) {
  const participant = await getParticipant(params.id)
  if (!participant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (params.filename === 'README.md') {
    return NextResponse.json({ error: 'Cannot delete README.md' }, { status: 400 })
  }

  await deleteLibraryFile(params.id, params.filename)
  participant.lastActiveAt = new Date().toISOString()
  await saveParticipant(participant)

  return NextResponse.json({ success: true })
}
