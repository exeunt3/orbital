import { NextRequest, NextResponse } from 'next/server'

import { getAllLogicSpaces, saveLogicSpace } from '@/lib/storage'
import type { LogicSpace } from '@/types/orbitalfork'

export async function GET() {
  const spaces = await getAllLogicSpaces()
  return NextResponse.json(spaces)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const space: LogicSpace = {
    id: crypto.randomUUID(),
    name: body.name ?? 'Untitled Space',
    description: body.description ?? '',
    createdBy: body.createdBy ?? '',
    createdAt: new Date().toISOString(),
    geometry: body.geometry ?? {
      type: 'orbital',
      orbital: { useExistingOrbits: true, proximityThreshold: 60, regionCount: 6 },
    },
    trigger: body.trigger ?? { type: 'manual' },
    comparison: body.comparison ?? {
      scope: 'full-library',
      maxCharsPerParticipant: parseInt(process.env.BRIDGING_MAX_CHARS ?? '8000'),
      excerptStrategy: 'heading-sample',
    },
    resonance: body.resonance ?? {
      mode: 'similarity',
      minimumScoreToRecord: 0.4,
      minimumScoreToNotify: 0.65,
    },
    participantIds: body.participantIds ?? [],
    isActive: body.isActive ?? true,
    lastRunAt: null,
    runCount: 0,
  }

  await saveLogicSpace(space)
  return NextResponse.json(space, { status: 201 })
}
