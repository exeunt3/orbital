// One-click acknowledgment endpoint — called from email links.
import { NextRequest, NextResponse } from 'next/server'
import { getFinding, getParticipant, updateFindingStatus } from '@/lib/storage'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url)
  const participantId = searchParams.get('participantId')
  const token = searchParams.get('token')

  if (!participantId || !token) {
    return new NextResponse('Missing parameters', { status: 400 })
  }

  const participant = await getParticipant(participantId)
  if (!participant || participant.token !== token) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const finding = await getFinding(params.id)
  if (!finding) return new NextResponse('Finding not found', { status: 404 })

  if (!finding.participantIds.includes(participantId)) {
    return new NextResponse('Not part of this finding', { status: 403 })
  }

  await updateFindingStatus(params.id, participantId, 'acknowledged')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return NextResponse.redirect(`${appUrl}/findings/${params.id}?token=${token}&ack=1`)
}
