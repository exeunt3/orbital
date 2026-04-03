import { NextRequest, NextResponse } from 'next/server'

import { getParticipant, getLogicSpace } from '@/lib/storage'
import { runBridge } from '@/engine/bridger'
import type { BridgeRequest } from '@/types/orbitalfork'

export async function POST(req: NextRequest) {
  const body: BridgeRequest = await req.json()
  const { participantAId, participantBId, logicSpaceId, runId } = body

  const [participantA, participantB, logicSpace] = await Promise.all([
    getParticipant(participantAId),
    getParticipant(participantBId),
    getLogicSpace(logicSpaceId),
  ])

  if (!participantA) return NextResponse.json({ error: `Participant ${participantAId} not found` }, { status: 404 })
  if (!participantB) return NextResponse.json({ error: `Participant ${participantBId} not found` }, { status: 404 })
  if (!logicSpace) return NextResponse.json({ error: `LogicSpace ${logicSpaceId} not found` }, { status: 404 })

  const finding = await runBridge(participantA, participantB, logicSpace, runId ?? crypto.randomUUID())

  return NextResponse.json({ finding })
}
