import { NextRequest, NextResponse } from 'next/server'
import { getFinding, updateFindingStatus } from '@/lib/storage'
import type { FindingStatus } from '@/types/orbitalfork'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const finding = await getFinding(params.id)
  if (!finding) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(finding)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { participantId, status } = await req.json()
  if (!participantId || !status) {
    return NextResponse.json({ error: 'participantId and status required' }, { status: 400 })
  }
  await updateFindingStatus(params.id, participantId, status as FindingStatus)
  const updated = await getFinding(params.id)
  return NextResponse.json(updated)
}
