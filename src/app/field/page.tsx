'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useFieldStore } from '@/store/field'
import ParticipantPanel from '@/components/ParticipantPanel'
import ResonancePanel from '@/components/ResonancePanel'

// OrbitalField uses Three.js — SSR incompatible
const OrbitalField = dynamic(() => import('@/components/OrbitalField'), { ssr: false })

export default function FieldPage() {
  const {
    participants,
    findings,
    logicSpaces,
    activeFinding,
    activeRun,
    phase,
    currentParticipantId,
    loadParticipants,
    loadFindings,
    loadLogicSpaces,
    setActiveFinding,
    setCurrentParticipant,
    markFindingAsSeen,
    runBridgeBatch,
  } = useFieldStore()

  useEffect(() => {
    loadParticipants()
    loadFindings({ limit: 50 })
    loadLogicSpaces()
  }, [loadParticipants, loadFindings, loadLogicSpaces])

  const handleParticipantClick = (id: string | null) => {
    setCurrentParticipant(id === currentParticipantId ? null : id)
  }

  const handleSelectFinding = (finding: typeof activeFinding) => {
    setActiveFinding(finding)
    if (finding && currentParticipantId) {
      markFindingAsSeen(finding.id, currentParticipantId)
    }
  }

  // Create a default logic space if none exist when participants are ready
  useEffect(() => {
    if (participants.length >= 2 && logicSpaces.length === 0) {
      fetch('/api/logic-spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Default space',
          description: 'Orbital geometry, similarity mode',
          geometry: {
            type: 'orbital',
            orbital: { useExistingOrbits: true, proximityThreshold: 80, regionCount: 6 },
          },
          trigger: { type: 'manual' },
          comparison: {
            scope: 'full-library',
            maxCharsPerParticipant: 8000,
            excerptStrategy: 'heading-sample',
          },
          resonance: {
            mode: 'similarity',
            minimumScoreToRecord: 0.4,
            minimumScoreToNotify: 0.65,
          },
        }),
      }).then(() => loadLogicSpaces())
    }
  }, [participants.length, logicSpaces.length, loadLogicSpaces])

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left: participant roster + bridge controls */}
      <ParticipantPanel
        participants={participants}
        findings={findings}
        logicSpaces={logicSpaces}
        currentParticipantId={currentParticipantId}
        phase={phase}
        onParticipantSelect={handleParticipantClick}
        onRunBridge={runBridgeBatch}
      />

      {/* Center: orbital visualization */}
      <div className="flex-1 relative">
        <OrbitalField
          participants={participants}
          findings={findings}
          onParticipantClick={handleParticipantClick}
        />

        {/* Phase indicator overlay */}
        {phase === 'bridging' && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 border border-field-border text-xs text-field-muted"
            style={{ background: 'rgba(0,0,0,0.8)' }}>
            bridging...
          </div>
        )}

        {phase === 'error' && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 border border-red-900 text-xs text-red-400"
            style={{ background: 'rgba(0,0,0,0.8)' }}>
            bridging failed — check console
          </div>
        )}

        {participants.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-field-muted text-sm mb-2">the field is empty</div>
              <div className="text-field-dim text-xs mb-4">register participants to begin</div>
              <a
                href="/onboard"
                className="pointer-events-auto border border-field-border px-4 py-2 text-xs text-field-muted hover:text-field-text hover:border-field-muted transition-colors"
              >
                register your first participant
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Right: findings panel */}
      <div className="w-80 border-l border-field-border overflow-hidden">
        <ResonancePanel
          findings={findings}
          participants={participants}
          activeFinding={activeFinding}
          activeRun={activeRun}
          currentParticipantId={currentParticipantId}
          onSelectFinding={handleSelectFinding}
        />
      </div>
    </div>
  )
}
