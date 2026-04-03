import { NextRequest, NextResponse } from 'next/server'
import { getAllFindings } from '@/lib/storage'
import type { FindingFilters, FindingType, FindingStatus } from '@/types/orbitalfork'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const filters: FindingFilters = {}
  if (searchParams.get('participantId')) filters.participantId = searchParams.get('participantId')!
  if (searchParams.get('logicSpaceId')) filters.logicSpaceId = searchParams.get('logicSpaceId')!
  if (searchParams.get('type')) filters.type = searchParams.get('type') as FindingType
  if (searchParams.get('minScore')) filters.minScore = parseFloat(searchParams.get('minScore')!)
  if (searchParams.get('status')) filters.status = searchParams.get('status') as FindingStatus
  if (searchParams.get('limit')) filters.limit = parseInt(searchParams.get('limit')!)

  const findings = await getAllFindings(filters)
  return NextResponse.json(findings)
}
