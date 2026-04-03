// Notification sending logic, extracted from API routes.

import { saveNotification } from '@/lib/storage'
import { sendResonanceFindingNotification } from '@/lib/email'
import type { ResonanceFinding, Participant, Notification } from '@/types/orbitalfork'

/**
 * Send resonance notifications for a set of findings.
 * Checks per-participant preferences before sending.
 * Returns the count of successfully sent notifications.
 */
export async function triggerNotifications(
  findings: ResonanceFinding[],
  participants: Participant[]
): Promise<number> {
  const pMap = new Map(participants.map(p => [p.id, p]))
  let count = 0

  for (const finding of findings) {
    const [idA, idB] = finding.participantIds
    const pA = pMap.get(idA)
    const pB = pMap.get(idB)
    if (!pA || !pB) continue

    const tasks: Array<Promise<void>> = []

    if (pA.notifyOnResonance && finding.score >= pA.resonanceThreshold) {
      tasks.push(
        sendResonanceFindingNotification(pA, finding, pB).then(async result => {
          const notification: Notification = {
            id: crypto.randomUUID(),
            participantId: pA.id,
            findingId: finding.id,
            status: result.success ? 'sent' : 'failed',
            sentAt: result.success ? new Date().toISOString() : null,
            failureReason: result.error ?? null,
            emailTo: pA.email,
            emailSubject: `Resonance detected — ${pB.displayName}`,
            emailBodyPreview: finding.bridgingSummary.slice(0, 200),
          }
          await saveNotification(notification)
          if (result.success) count++
        })
      )
    }

    if (pB.notifyOnResonance && finding.score >= pB.resonanceThreshold) {
      tasks.push(
        sendResonanceFindingNotification(pB, finding, pA).then(async result => {
          const notification: Notification = {
            id: crypto.randomUUID(),
            participantId: pB.id,
            findingId: finding.id,
            status: result.success ? 'sent' : 'failed',
            sentAt: result.success ? new Date().toISOString() : null,
            failureReason: result.error ?? null,
            emailTo: pB.email,
            emailSubject: `Resonance detected — ${pA.displayName}`,
            emailBodyPreview: finding.bridgingSummary.slice(0, 200),
          }
          await saveNotification(notification)
          if (result.success) count++
        })
      )
    }

    await Promise.all(tasks)
  }

  return count
}
