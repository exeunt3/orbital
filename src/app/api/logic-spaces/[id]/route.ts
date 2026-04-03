import { NextRequest, NextResponse } from 'next/server'
import { getLogicSpace, saveLogicSpace } from '@/lib/storage'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const space = await getLogicSpace(params.id)
  if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(space)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const space = await getLogicSpace(params.id)
  if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const allowed = ['name', 'description', 'geometry', 'trigger', 'comparison', 'resonance', 'participantIds', 'isActive']
  for (const key of allowed) {
    if (key in body) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(space as any)[key] = body[key]
    }
  }

  await saveLogicSpace(space)
  return NextResponse.json(space)
}
