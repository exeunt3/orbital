import { NextRequest, NextResponse } from 'next/server'

import {
  getLogicSpace,
  getAllParticipants,
  getAllFindings,
  saveLogicSpace,
} from '@/lib/storage'
import { runBridge } from '@/engine/bridger'
import { computePairsForRun } from '@/lib/geometry'
import { triggerNotifications } from '@/lib/notifications'
import type { BridgingRun, ResonanceFinding } from '@/types/orbitalfork'

export async function POST(req: NextRequest) {
  const { logicSpaceId } = await req.json()
  if (!logicSpaceId) {
    return NextResponse.json({ error: 'logicSpaceId is required' }, { status: 400 })
  }

  const logicSpace = await getLogicSpace(logicSpaceId)
  if (!logicSpace) {
    return NextResponse.json({ error: 'LogicSpace not found' }, { status: 404 })
  }

  const runId = crypto.randomUUID()
  const run: BridgingRun = {
    id: runId,
    logicSpaceId,
    startedAt: new Date().toISOString(),
    completedAt: null,
    pairsAnalyzed: 0,
    findingsGenerated: 0,
    notificationsSent: 0,
    status: 'running',
    log: [],
  }

  try {
    const [participants, existingFindings] = await Promise.all([
      getAllParticipants(),
      getAllFindings({ logicSpaceId }),
    ])

    const simTime = Date.now() / 1000
    const pairs = computePairsForRun(participants, logicSpace, existingFindings, simTime)
    run.log.push(`Computed ${pairs.length} pairs using ${logicSpace.geometry.type} geometry`)

    const findings: ResonanceFinding[] = []

    for (const [idA, idB] of pairs) {
      run.pairsAnalyzed++
      const pA = participants.find(p => p.id === idA)!
      const pB = participants.find(p => p.id === idB)!

      run.log.push(`Bridging ${pA.displayName} × ${pB.displayName}...`)

      const finding = await runBridge(pA, pB, logicSpace, runId)
      if (finding) {
        findings.push(finding)
        run.findingsGenerated++
        run.log.push(`  → Finding: ${finding.type} (score ${finding.score.toFixed(2)})`)
      } else {
        run.log.push(`  → No finding (below threshold or missing README)`)
      }
    }

    // Send notifications for findings above the notify threshold
    const notifiable = findings.filter(
      f => f.score >= logicSpace.resonance.minimumScoreToNotify
    )
    if (notifiable.length > 0) {
      const notified = await triggerNotifications(notifiable, participants)
      run.notificationsSent = notified
      run.log.push(`Sent ${notified} notification(s)`)
    }

    run.completedAt = new Date().toISOString()
    run.status = 'complete'

    // Update logic space metadata
    logicSpace.lastRunAt = run.completedAt
    logicSpace.runCount = (logicSpace.runCount ?? 0) + 1
    await saveLogicSpace(logicSpace)

    return NextResponse.json({ run, findings })
  } catch (err) {
    run.status = 'failed'
    run.completedAt = new Date().toISOString()
    run.log.push(`Error: ${err instanceof Error ? err.message : String(err)}`)
    return NextResponse.json({ run, findings: [] }, { status: 500 })
  }
}
