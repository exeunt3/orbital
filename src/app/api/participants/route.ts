import { NextRequest, NextResponse } from 'next/server'

import {
  getAllParticipants,
  saveParticipant,
  getLibraryMeta,
} from '@/lib/storage'
import type { Participant, ParticipantVisual, OrbitalParams } from '@/types/orbitalfork'
import { ORBITAL_PRESETS, GLYPH_POOL, COLOR_POOL } from '@/types/orbitalfork'

export async function GET() {
  const participants = await getAllParticipants()
  return NextResponse.json(participants)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { displayName, email, bio, researchFocus } = body

  if (!displayName || !email) {
    return NextResponse.json({ error: 'displayName and email are required' }, { status: 400 })
  }

  const id = slugify(displayName)
  const existing = await getAllParticipants()

  if (existing.some(p => p.id === id)) {
    return NextResponse.json({ error: `Participant id "${id}" already exists` }, { status: 409 })
  }

  // Assign visual identity from pools
  const usedColors = new Set(existing.map(p => p.visual.color))
  const usedGlyphs = new Set(existing.map(p => p.visual.glyph))
  const color = COLOR_POOL.find(c => !usedColors.has(c)) ?? COLOR_POOL[existing.length % COLOR_POOL.length]
  const glyph = GLYPH_POOL.find(g => !usedGlyphs.has(g)) ?? GLYPH_POOL[existing.length % GLYPH_POOL.length]

  const visual: ParticipantVisual = {
    color,
    size: 7 + Math.random() * 3,
    traceOpacity: 0.3 + Math.random() * 0.3,
    glyph,
  }

  const orbitalParams: OrbitalParams = ORBITAL_PRESETS[existing.length % ORBITAL_PRESETS.length]

  const libraryMeta = await getLibraryMeta(id)

  const participant: Participant = {
    id,
    displayName,
    email,
    bio: bio ?? '',
    researchFocus: researchFocus ?? '',
    visual,
    orbitalParams,
    libraryMeta,
    status: 'active',
    joinedAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    token: crypto.randomUUID(),
    notifyOnResonance: true,
    resonanceThreshold: 0.6,
  }

  await saveParticipant(participant)
  return NextResponse.json(participant, { status: 201 })
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40)
}
