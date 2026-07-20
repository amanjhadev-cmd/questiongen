/**
 * Semantic field extraction — the single place that knows WHERE each meaningful
 * field lives, so the rest of the pipeline (dedup, coverage, concept-mapping,
 * diagrams) works regardless of question JSON shape.
 *
 * Supports two shapes:
 *  - Nested (production):  { metadata: {...}, question: {...} }
 *  - Flat (legacy/seed):   { question_text, options, difficulty, ... }
 */

export interface QuestionFields {
  questionType: string
  questionText: string
  difficulty: string | null      // normalised: easy | medium | hard
  bloomLevel: string | null      // normalised lower-case, primary bloom
  conceptUuids: string[]
  diagramUrl: string | null      // embedded URL (nested format already has the image)
  diagramRequired: boolean       // whether to create a diagram job (flat format)
  diagramDescription: string | null
  isNested: boolean
}

function normLevel(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const m = v.toUpperCase().replace(/^LEVEL_/, '')
  const map: Record<string, string> = { EASY: 'easy', MEDIUM: 'medium', HARD: 'hard' }
  return map[m] ?? v.toLowerCase()
}

export function extractQuestionFields(content: Record<string, unknown>): QuestionFields {
  const meta = content.metadata as Record<string, unknown> | undefined
  const q = content.question as Record<string, unknown> | undefined

  // ── Nested production format ──────────────────────────────────────────────────
  if (meta && q) {
    const concepts = Array.isArray(meta.concepts) ? (meta.concepts as Array<Record<string, unknown>>) : []
    const bloom = Array.isArray(meta.bloom) ? (meta.bloom as Array<Record<string, unknown>>) : []
    const primaryBloom = bloom
      .slice()
      .sort((a, b) => (Number(a.bloom_priority ?? 99)) - (Number(b.bloom_priority ?? 99)))[0]
    return {
      questionType: String(meta.question_type ?? ''),
      questionText: String(q.question_text ?? ''),
      difficulty: normLevel(meta.question_level),
      bloomLevel: primaryBloom?.bloom_level ? String(primaryBloom.bloom_level).toLowerCase() : null,
      conceptUuids: concepts.map((c) => String(c.concept_uuid ?? '')).filter(Boolean),
      diagramUrl: q.question_diagram_url ? String(q.question_diagram_url) : null,
      diagramRequired: false, // nested format embeds the URL; no separate job
      diagramDescription: null,
      isNested: true,
    }
  }

  // ── Flat legacy format ────────────────────────────────────────────────────────
  return {
    questionType: String(content.question_type ?? ''),
    questionText: String(content.question_text ?? ''),
    difficulty: content.difficulty ? String(content.difficulty) : null,
    bloomLevel: content.bloom_level ? String(content.bloom_level).toLowerCase() : null,
    conceptUuids: Array.isArray(content.concept_uuids) ? (content.concept_uuids as unknown[]).map(String) : [],
    diagramUrl: null,
    diagramRequired: content.diagram_required === true,
    diagramDescription: content.diagram_description ? String(content.diagram_description) : null,
    isNested: false,
  }
}
