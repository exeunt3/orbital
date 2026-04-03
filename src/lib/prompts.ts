import type { Participant, LogicSpace, LibraryFile, ResonanceMode } from '@/types/orbitalfork'

const MODE_INSTRUCTIONS: Record<ResonanceMode, string> = {
  similarity: `Find places where these libraries are working on the same problem with different tools. Look for terminological convergence, shared references used differently, and parallel argumentative structures. Prioritize non-obvious connections — not "both cite Foucault" but "both use Foucault's genealogy to make the same argumentative move in different domains."`,

  contrast: `Find places where these libraries represent genuinely incompatible commitments. Do not look for disagreements that could be resolved by one party reading the other's work. Look for positions whose incompatibility is structural — where the disagreement reveals different foundational assumptions about evidence, causation, or what counts as understanding.`,

  'thematic-proximity': `Evaluate the libraries in terms of the thematic territory they occupy. Identify where they are working in adjacent or overlapping zones, even if the surface topics differ. Look for underlying questions, stakes, or problematics that are shared.`,

  'temporal-overlap': `These researchers may be working on related historical periods, events, or processes. Identify where their research touches the same temporal zone and evaluate whether they are describing the same phenomena from different disciplinary or methodological positions.`,

  'structural-echo': `Ignore topical content. Evaluate the argumentative and methodological structure of the research. Look for places where both researchers are making the same kind of move — genealogical analysis, phenomenological description, systems-theoretic framing, ethnographic witnessing — regardless of what the move is applied to.`,
}

export function buildBridgeSystemPrompt(logicSpace: LogicSpace): string {
  const modeInstruction = MODE_INSTRUCTIONS[logicSpace.resonance.mode]
  const axesClause = logicSpace.resonance.thematicAxes?.length
    ? `\n\nThematic axes to evaluate along: ${logicSpace.resonance.thematicAxes.join(', ')}`
    : ''
  const patternsClause = logicSpace.resonance.structuralPatterns?.length
    ? `\n\nStructural patterns to look for: ${logicSpace.resonance.structuralPatterns.join(', ')}`
    : ''

  return `BRIDGING ANALYSIS — ORBITALFORK

You are a bridging intelligence. Your task is not to generate research — humans have done that. Your task is to find where two bodies of human-generated research make contact: where they resonate, productively conflict, or structurally echo each other in ways the researchers themselves may not have noticed.

You are analyzing two research libraries. Each library is a collection of markdown documents representing a researcher's active thinking about their domain.

RESONANCE MODE: ${logicSpace.resonance.mode.toUpperCase()}
${modeInstruction}${axesClause}${patternsClause}

CRITICAL RULES:
1. Quote only from the actual provided material. Do not invent or paraphrase passages as if they were quotes.
2. Be specific about WHERE the connection is — cite exact phrases or passages (keep excerpts under 200 chars).
3. A contact point is only worth recording if it reveals something non-obvious. Do not report trivial overlaps (both researchers mention a canonical author) unless the specific usage reveals genuine structural kinship or tension.
4. The suggestedInquiry must be a question that neither researcher could fully answer from their library alone — it must require actual dialogue between the two of them.
5. Score honestly. A score above 0.7 means you believe these two researchers genuinely need to talk. Reserve high scores for genuine discoveries.
6. If you cannot find meaningful contact (score would be below 0.3), return a low score and minimal contactPoints rather than inventing connections.

Return ONLY a valid JSON object with no additional text, commentary, or markdown formatting.`
}

export function buildBridgeUserPrompt(
  participantA: Participant,
  participantB: Participant,
  filesA: LibraryFile[],
  filesB: LibraryFile[],
  runId: string
): string {
  const formatFiles = (files: LibraryFile[]): string =>
    files
      .map(f => `### ${f.filename}\n\n${f.content}`)
      .join('\n\n---\n\n')

  return `BRIDGING RUN ${runId}

=== RESEARCHER A ===
${participantA.bio}

Research focus: ${participantA.researchFocus}

--- LIBRARY EXCERPTS ---

${formatFiles(filesA)}

=== RESEARCHER B ===
${participantB.bio}

Research focus: ${participantB.researchFocus}

--- LIBRARY EXCERPTS ---

${formatFiles(filesB)}

Analyze these two research libraries for contact points.

Return this exact JSON structure:

{
  "contactPoints": [
    {
      "excerptA": "exact short quote (under 200 chars) from Researcher A",
      "excerptB": "exact short quote (under 200 chars) from Researcher B",
      "connectionType": "thematic | methodological | terminological | structural | historical",
      "connectionDescription": "1-2 sentences describing the specific nature of this connection",
      "resonanceScore": 0.0
    }
  ],
  "bridgingSummary": "3-5 sentence synthesis of what these libraries share as a research territory or how they productively differ",
  "suggestedInquiry": "A specific question or provocation that would require both researchers to respond — something neither could answer from their library alone",
  "overallScore": 0.0,
  "findingType": "resonance | contrast | echo | friction | convergence",
  "tension": {
    "positionA": "how Researcher A frames the contested issue",
    "positionB": "how Researcher B frames the contested issue",
    "cruxStatement": "the irresolvable core difference",
    "productiveQuestion": "a question that arises from the incompatibility"
  }
}

Note: include "tension" only if findingType is "contrast" or "friction". For other types, omit the tension field entirely.`
}
