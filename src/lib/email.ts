import { Resend } from 'resend'
import type { Participant, ResonanceFinding } from '@/types/orbitalfork'

let _resend: Resend | null = null

function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set.')
    }
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

export async function sendResonanceFindingNotification(
  participant: Participant,
  finding: ResonanceFinding,
  otherParticipant: Participant
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const findingUrl = `${appUrl}/findings/${finding.id}?token=${participant.token}`
  const ackUrl = `${appUrl}/api/findings/${finding.id}/ack?participantId=${participant.id}&token=${participant.token}`

  const topContactPoints = finding.contactPoints
    .sort((a, b) => b.resonanceScore - a.resonanceScore)
    .slice(0, 2)

  const contactPointsHtml = topContactPoints
    .map(
      cp => `
      <div style="margin: 16px 0; padding: 16px; background: #0a0a0a; border-left: 2px solid #333;">
        <div style="display: flex; gap: 16px;">
          <div style="flex: 1;">
            <div style="color: #888; font-size: 11px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;">You</div>
            <p style="color: #c8c4bc; font-style: italic; font-size: 13px; margin: 0;">"${cp.excerptA}"</p>
          </div>
          <div style="flex: 1;">
            <div style="color: #888; font-size: 11px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;">${otherParticipant.displayName}</div>
            <p style="color: #c8c4bc; font-style: italic; font-size: 13px; margin: 0;">"${cp.excerptB}"</p>
          </div>
        </div>
        <p style="color: #666; font-size: 12px; margin: 10px 0 0 0;">${cp.connectionDescription}</p>
      </div>`
    )
    .join('')

  const scorePercent = Math.round(finding.score * 100)
  const findingTypeLabel = finding.type.charAt(0).toUpperCase() + finding.type.slice(1)

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="background: #000; color: #e8e4dc; font-family: 'Courier New', Courier, monospace; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 24px;">

    <div style="margin-bottom: 32px;">
      <div style="color: #444; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px;">orbitalfork — resonance detected</div>
      <h1 style="color: #e8e4dc; font-size: 20px; font-weight: normal; margin: 0;">
        ${otherParticipant.visual.glyph} ${otherParticipant.displayName}
      </h1>
      <div style="color: #666; font-size: 12px; margin-top: 6px;">
        ${findingTypeLabel} · ${scorePercent}% resonance
      </div>
    </div>

    <div style="margin-bottom: 32px;">
      <div style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">What was found</div>
      <p style="color: #c8c4bc; line-height: 1.6; margin: 0; font-size: 14px;">${finding.bridgingSummary}</p>
    </div>

    ${contactPointsHtml}

    <div style="margin: 32px 0; padding: 20px; background: #060606; border: 1px solid #222;">
      <div style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">A question for both of you</div>
      <p style="color: #e8e4dc; font-size: 15px; line-height: 1.6; margin: 0; font-style: italic;">${finding.suggestedInquiry}</p>
    </div>

    ${finding.tension ? `
    <div style="margin: 24px 0; padding: 16px; border-left: 2px solid #444;">
      <div style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px;">The tension</div>
      <p style="color: #c8c4bc; font-size: 13px; margin: 0;">${finding.tension.cruxStatement}</p>
    </div>` : ''}

    <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #222;">
      <a href="${findingUrl}" style="display: inline-block; padding: 10px 20px; background: #1a1a1a; color: #e8e4dc; text-decoration: none; font-size: 13px; border: 1px solid #333; margin-right: 12px;">View full finding</a>
      <a href="${ackUrl}" style="display: inline-block; padding: 10px 20px; background: transparent; color: #888; text-decoration: none; font-size: 13px; border: 1px solid #222;">Acknowledge</a>
    </div>

    <div style="margin-top: 32px; color: #444; font-size: 11px; line-height: 1.6;">
      You are receiving this because you are a participant in an orbitalfork research field.<br>
      Your participant profile: <a href="${appUrl}/participants/${participant.id}?token=${participant.token}" style="color: #666;">manage your library</a>
    </div>

  </div>
</body>
</html>`

  const text = `ORBITALFORK — RESONANCE DETECTED

${otherParticipant.displayName} (${findingTypeLabel}, ${scorePercent}% resonance)

WHAT WAS FOUND
${finding.bridgingSummary}

A QUESTION FOR BOTH OF YOU
${finding.suggestedInquiry}

${finding.tension ? `THE TENSION\n${finding.tension.cruxStatement}\n\n` : ''}View full finding: ${findingUrl}
Acknowledge: ${ackUrl}`

  try {
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'notifications@orbitalfork.local'
    await getResend().emails.send({
      from: fromEmail,
      to: participant.email,
      subject: `Resonance detected — ${otherParticipant.displayName}`,
      html,
      text,
    })
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}
