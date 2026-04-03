'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { Participant, ResonanceFinding } from '@/types/orbitalfork'
import { getOrbitalPosition, getOrbitPathPoints } from '@/engine/orbit'

interface OrbitalFieldProps {
  participants: Participant[]
  findings: ResonanceFinding[]
  onParticipantClick?: (participantId: string) => void
}

interface ParticipantObject {
  group: THREE.Group
  orbitLine: THREE.Line
  wakeLine: THREE.Line
  wakePositions: THREE.BufferAttribute
}

const WAKE_LENGTH = 80

export default function OrbitalField({ participants, findings, onParticipantClick }: OrbitalFieldProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const labelsRef = useRef<HTMLDivElement>(null)
  const onClickRef = useRef(onParticipantClick)
  useEffect(() => { onClickRef.current = onParticipantClick }, [onParticipantClick])

  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    fieldGroup: THREE.Group
    participantObjects: Map<string, ParticipantObject>
    alignmentObjects: THREE.LineSegments[]
    animFrame: number
    clock: THREE.Clock
  } | null>(null)

  const participantsRef = useRef(participants)
  useEffect(() => { participantsRef.current = participants }, [participants])

  const findingsRef = useRef(findings)
  useEffect(() => { findingsRef.current = findings }, [findings])

  // ─── Initialize scene ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!mountRef.current) return
    const mount = mountRef.current

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)

    const w = mount.clientWidth
    const h = mount.clientHeight
    const camera = new THREE.PerspectiveCamera(52, w / h, 1, 3000)
    camera.position.set(0, 420, 340)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.LinearToneMapping
    renderer.toneMappingExposure = 1.0
    mount.appendChild(renderer.domElement)

    // Lighting
    const primary = new THREE.DirectionalLight(0xffffff, 3.5)
    primary.position.set(280, 380, 220)
    scene.add(primary)
    scene.add(new THREE.AmbientLight(0xffffff, 0.04))

    // Star field
    const starCount = 420
    const starPos = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount * 3; i++) {
      starPos[i] = (Math.random() - 0.5) * 2600
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, sizeAttenuation: true, transparent: true, opacity: 0.55 })
    scene.add(new THREE.Points(starGeo, starMat))

    // Shared research field — central body (replaces archive)
    const fieldGeo = new THREE.IcosahedronGeometry(44, 3)
    const posAttr = fieldGeo.attributes.position
    for (let i = 0; i < posAttr.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(posAttr, i)
      const d =
        Math.sin(v.x * 0.22) * Math.cos(v.y * 0.17) * Math.sin(v.z * 0.19) * 8 +
        Math.sin(v.x * 0.44 + 1.1) * Math.cos(v.z * 0.37) * 3.5
      v.normalize().multiplyScalar(44 + d)
      posAttr.setXYZ(i, v.x, v.y, v.z)
    }
    fieldGeo.computeVertexNormals()
    const fieldMat = new THREE.MeshStandardMaterial({ color: 0xf0ece4, roughness: 0.92, metalness: 0.0 })
    const fieldMesh = new THREE.Mesh(fieldGeo, fieldMat)
    const fieldWireGeo = new THREE.WireframeGeometry(fieldGeo)
    const fieldWireMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55 })
    const fieldWire = new THREE.LineSegments(fieldWireGeo, fieldWireMat)
    const fieldGroup = new THREE.Group()
    fieldGroup.add(fieldMesh)
    fieldGroup.add(fieldWire)
    scene.add(fieldGroup)

    const participantObjects = new Map<string, ParticipantObject>()
    const alignmentObjects: THREE.LineSegments[] = []

    const clock = new THREE.Clock()
    const _projVec = new THREE.Vector3()

    const animate = () => {
      const animFrame = requestAnimationFrame(animate)
      if (sceneRef.current) sceneRef.current.animFrame = animFrame

      const t = clock.getElapsedTime()

      fieldGroup.rotation.y = t * 0.014
      fieldGroup.rotation.x = Math.sin(t * 0.007) * 0.03

      const currentParticipants = participantsRef.current
      const currentFindings = findingsRef.current

      currentParticipants.forEach((p) => {
        if (p.status !== 'active') return
        const obj = participantObjects.get(p.id)
        if (!obj) return

        const pos = getOrbitalPosition(p.orbitalParams, t)
        obj.group.position.set(pos.x, pos.y, pos.z)
        obj.group.rotation.y = t * 0.08
        obj.group.rotation.x = t * 0.04

        // Wake trail
        const wp = obj.wakePositions
        for (let i = (WAKE_LENGTH - 1) * 3; i >= 3; i -= 3) {
          wp.array[i]     = wp.array[i - 3]
          wp.array[i + 1] = wp.array[i - 2]
          wp.array[i + 2] = wp.array[i - 1]
        }
        wp.array[0] = pos.x
        wp.array[1] = pos.y
        wp.array[2] = pos.z
        wp.needsUpdate = true
      })

      // Alignment markers for new findings
      alignmentObjects.forEach((o) => { o.visible = false })
      const newFindings = currentFindings.filter(f => f.statusA === 'new' || f.statusB === 'new')
      newFindings.forEach((finding, idx) => {
        const pA = currentParticipants.find(p => p.id === finding.participantIds[0])
        const pB = currentParticipants.find(p => p.id === finding.participantIds[1])
        if (!pA || !pB) return

        const posA = getOrbitalPosition(pA.orbitalParams, t)
        const posB = getOrbitalPosition(pB.orbitalParams, t)
        const mid = { x: (posA.x + posB.x) / 2, y: (posA.y + posB.y) / 2, z: (posA.z + posB.z) / 2 }

        if (!alignmentObjects[idx]) {
          const geo = new THREE.IcosahedronGeometry(22, 1)
          const wire = new THREE.WireframeGeometry(geo)
          const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
          const obj = new THREE.LineSegments(wire, mat)
          alignmentObjects.push(obj)
          scene.add(obj)
        }

        const obj = alignmentObjects[idx]
        obj.visible = true
        obj.position.set(mid.x, mid.y, mid.z)
        obj.rotation.y = t * 0.4
        obj.rotation.x = t * 0.25
        ;(obj.material as THREE.LineBasicMaterial).opacity = 0.25 + Math.sin(t * 1.8) * 0.12
      })

      renderer.render(scene, camera)

      // Label positions
      const labels = labelsRef.current
      if (labels) {
        currentParticipants.forEach((p) => {
          const obj = participantObjects.get(p.id)
          const el = labels.querySelector<HTMLElement>(`[data-id="${p.id}"]`)
          if (!obj || !el) return
          if (p.status !== 'active') { el.style.display = 'none'; return }
          _projVec.setFromMatrixPosition(obj.group.matrixWorld)
          _projVec.project(camera)
          const x = (_projVec.x * 0.5 + 0.5) * mount.clientWidth
          const y = (-_projVec.y * 0.5 + 0.5) * mount.clientHeight
          if (_projVec.z > 1) { el.style.display = 'none'; return }
          el.style.display = 'block'
          el.style.transform = `translate(-50%, -150%) translate(${x}px, ${y}px)`
        })
      }
    }
    const animFrame = requestAnimationFrame(animate)

    sceneRef.current = {
      renderer, scene, camera, fieldGroup, participantObjects, alignmentObjects, animFrame, clock,
    }

    // Click — raycast to participant spheres
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const onClick = (e: MouseEvent) => {
      if (!sceneRef.current) return
      const rect = mount.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, sceneRef.current.camera)

      const spheres: { mesh: THREE.Mesh; participantId: string }[] = []
      sceneRef.current.participantObjects.forEach((obj, id) => {
        if (obj.group.visible) {
          const sphere = obj.group.children[0] as THREE.Mesh
          spheres.push({ mesh: sphere, participantId: id })
        }
      })

      const intersects = raycaster.intersectObjects(spheres.map(s => s.mesh))
      if (intersects.length > 0) {
        const hit = spheres.find(s => s.mesh === intersects[0].object)
        if (hit) onClickRef.current?.(hit.participantId)
      }
    }
    mount.addEventListener('click', onClick)

    const onResize = () => {
      if (!mount || !sceneRef.current) return
      const w2 = mount.clientWidth
      const h2 = mount.clientHeight
      sceneRef.current.camera.aspect = w2 / h2
      sceneRef.current.camera.updateProjectionMatrix()
      sceneRef.current.renderer.setSize(w2, h2)
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      mount.removeEventListener('click', onClick)
      cancelAnimationFrame(animFrame)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      sceneRef.current = null
    }
  }, [])

  // ─── Sync participants when roster changes ─────────────────────────────────

  useEffect(() => {
    if (!sceneRef.current) return
    const { scene, participantObjects } = sceneRef.current

    participants.forEach((p) => {
      if (participantObjects.has(p.id)) return
      const obj = createParticipantObject(p)
      participantObjects.set(p.id, obj)
      scene.add(obj.group)
      scene.add(obj.orbitLine)
      scene.add(obj.wakeLine)
    })
  }, [participants])

  return (
    <div ref={mountRef} className="w-full h-full relative" style={{ cursor: 'crosshair' }}>
      <div ref={labelsRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
        {participants.map((p) => (
          <div
            key={p.id}
            data-id={p.id}
            className="absolute top-0 left-0 pointer-events-auto"
            style={{ display: 'none' }}
            onClick={(e) => { e.stopPropagation(); onParticipantClick?.(p.id) }}
          >
            <div className="flex flex-col items-center gap-0.5 select-none" style={{ cursor: 'pointer' }}>
              <span
                className="text-[10px] font-mono uppercase tracking-widest whitespace-nowrap px-1 py-0.5 rounded"
                style={{
                  color: p.visual.color,
                  background: 'rgba(0,0,0,0.65)',
                  opacity: 0.9,
                  letterSpacing: '0.12em',
                }}
              >
                {p.visual.glyph} {p.displayName.split(' ')[0]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Factory ──────────────────────────────────────────────────────────────────

function createParticipantObject(p: Participant): ParticipantObject {
  const r = p.visual.size
  const color = new THREE.Color(p.visual.color)

  // Sphere
  const sphereGeo = new THREE.SphereGeometry(r, 28, 28)
  const sphereMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.68,
    metalness: 0.05,
    emissive: color,
    emissiveIntensity: 0.05,
  })
  const sphere = new THREE.Mesh(sphereGeo, sphereMat)

  const group = new THREE.Group()
  group.add(sphere)

  // Armillary ring — one ring per participant, tilted by hash of id
  const ringR = r * 1.22
  const tiltSeed = p.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const tiltX = ((tiltSeed * 137.5) % 90) * (Math.PI / 180)

  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * Math.PI * 2
    pts.push(new THREE.Vector3(Math.cos(a) * ringR, Math.sin(a) * ringR, 0))
  }
  const ringGeo = new THREE.BufferGeometry().setFromPoints(pts)
  const ringMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 })
  const ring = new THREE.Line(ringGeo, ringMat)
  ring.rotation.x = tiltX
  group.add(ring)

  // Orbit path
  const orbitPts = getOrbitPathPoints(p.orbitalParams)
  const orbitGeo = new THREE.BufferGeometry().setFromPoints(
    orbitPts.map(v => new THREE.Vector3(v.x, v.y, v.z))
  )
  const orbitMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: p.visual.traceOpacity * 0.5 })
  const orbitLine = new THREE.Line(orbitGeo, orbitMat)

  // Wake trail
  const wakeArr = new Float32Array(WAKE_LENGTH * 3).fill(0)
  const wakeGeo = new THREE.BufferGeometry()
  const wakePositions = new THREE.BufferAttribute(wakeArr, 3)
  wakeGeo.setAttribute('position', wakePositions)
  wakeGeo.setDrawRange(0, WAKE_LENGTH)
  const wakeMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: p.visual.traceOpacity })
  const wakeLine = new THREE.Line(wakeGeo, wakeMat)

  return { group, orbitLine, wakeLine, wakePositions }
}
