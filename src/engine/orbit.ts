// Pure orbital mechanics — no Three.js imports.
// Reused from orbital with type import updated.

import type { OrbitalParams } from '@/types/orbitalfork'

export interface Vec3 {
  x: number
  y: number
  z: number
}

export function getOrbitalPosition(params: OrbitalParams, time: number): Vec3 {
  const { semiMajorAxis: a, eccentricity: e, inclination, speed, phase } = params
  const b = a * Math.sqrt(1 - e * e)
  const angle = phase + time * speed

  const x = a * Math.cos(angle)
  const zEllipse = b * Math.sin(angle)

  const incRad = (inclination * Math.PI) / 180
  const y = zEllipse * Math.sin(incRad)
  const z = zEllipse * Math.cos(incRad)

  return { x, y, z }
}

export function getOrbitPathPoints(params: OrbitalParams, segments = 128): Vec3[] {
  const { semiMajorAxis: a, eccentricity: e, inclination } = params
  const b = a * Math.sqrt(1 - e * e)
  const incRad = (inclination * Math.PI) / 180
  const points: Vec3[] = []

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    const x = a * Math.cos(angle)
    const zEllipse = b * Math.sin(angle)
    const y = zEllipse * Math.sin(incRad)
    const z = zEllipse * Math.cos(incRad)
    points.push({ x, y, z })
  }
  return points
}

export function getCurrentRegion(params: OrbitalParams, time: number, regionCount: number): number {
  const angle = ((params.phase + time * params.speed) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
  return Math.floor((angle / (Math.PI * 2)) * regionCount)
}

export function vec3Distance(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export function areParticipantsProximate(
  paramsA: OrbitalParams,
  paramsB: OrbitalParams,
  time: number,
  threshold = 60
): boolean {
  const posA = getOrbitalPosition(paramsA, time)
  const posB = getOrbitalPosition(paramsB, time)
  return vec3Distance(posA, posB) < threshold
}
