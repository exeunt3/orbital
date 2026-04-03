import { NextRequest, NextResponse } from 'next/server'
import { getParticipant, getFinding, saveNotification } from '@/lib/storage'
import { sendResonanceFindingNotification } from '@/lib/email'
import type { Notification } from '@/types/orbitalfork'

// POST body: { findingId, participantId }
// Used for manual single-notification triggers.
export async function POST(req: NextRequest) {
  const { findingId, participantId } = await req.json()
  if (!findingId || !participantId) {
    return NextResponse.json({ error: 'findingId and participantId required' }, { status: 400 })
  }

  const finding = await getFinding(findingId)
  if (!finding) return NextResponse.json({ error: 'Finding not found' }, { status: 404 })

  const participant = await getParticipant(participantId)
  if (!participant) return NextResponse.json({ error: 'Participant not found' }, { status: 404 })

  const otherId = finding.participantIds.find(id => id !== participantId)
  if (!otherId) return NextResponse.json({ error: 'Participant is not part of this finding' }, { status: 400 })

  const otherParticipant = await getParticipant(otherId)
  if (!otherParticipant) return NextResponse.json({ error: 'Other participant not found' }, { status: 404 })

  const result = await sendResonanceFindingNotification(participant, finding, otherParticipant)

  const notification: Notification = {
    id: crypto.randomUUID(),
    participantId,
    findingId,
    status: result.success ? 'sent' : 'failed',
    sentAt: result.success ? new Date().toISOString() : null,
    failureReason: result.error ?? null,
    emailTo: participant.email,
    emailSubject: `Resonance detected — ${otherParticipant.displayName}`,
    emailBodyPreview: finding.bridgingSummary.slice(0, 200),
  }
  await saveNotification(notification)

  return NextResponse.json({ notification })
}
