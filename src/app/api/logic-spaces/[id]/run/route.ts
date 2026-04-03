import { NextRequest, NextResponse } from 'next/server'

// Convenience route — triggers a batch bridge run for a specific logic space.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const response = await fetch(`${baseUrl}/api/bridge/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ logicSpaceId: params.id }),
  })

  const data = await response.json()
  return NextResponse.json(data, { status: response.status })
}
