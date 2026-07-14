import crypto from 'crypto'

/**
 * Text de-duplication helpers.
 *
 * Uses trigram (3-gram) Jaccard similarity, the same idea as Postgres pg_trgm,
 * but computed in-app so no DB extension is required. Comparison sets stay
 * small because dedup is scoped per chapter.
 */

// Lowercase, strip punctuation, collapse whitespace.
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function hashText(normalized: string): string {
  return crypto.createHash('sha1').update(normalized).digest('hex')
}

// Build the set of padded trigrams for a normalized string (pg_trgm style).
export function trigramSet(normalized: string): Set<string> {
  const set = new Set<string>()
  if (!normalized) return set
  for (const word of normalized.split(' ')) {
    if (!word) continue
    const padded = `  ${word} `
    for (let i = 0; i < padded.length - 2; i++) {
      set.add(padded.slice(i, i + 3))
    }
  }
  return set
}

// Jaccard similarity of two trigram sets: |A ∩ B| / |A ∪ B|.
export function trigramSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  const [small, large] = a.size < b.size ? [a, b] : [b, a]
  for (const g of small) if (large.has(g)) intersection++
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}

export interface ExistingText {
  id: string
  normalizedText: string
  textHash: string
  trigrams?: Set<string>
}

export interface DuplicateMatch {
  matchedQuestionId: string
  similarity: number
  exact: boolean
}

// Extract the ordered list of numeric tokens from a normalized string.
function extractNumbers(s: string): string[] {
  return s.match(/\d+/g) ?? []
}

// Replace every run of digits with a placeholder so we can compare the
// non-numeric "template" of a question.
function skeleton(s: string): string {
  return s.replace(/\d+/g, '#').replace(/\s+/g, ' ').trim()
}

function sameNumbers(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

/**
 * Returns the best duplicate match for `candidate` against `existing`, or null.
 * A match is an exact hash hit, or trigram similarity strictly greater than
 * `threshold` (default 0.85).
 *
 * Numeric variants are deliberately NOT treated as duplicates: if two questions
 * share the same template (numbers removed) but differ in their numbers — e.g.
 * "Calculate 12 × 3" vs "Calculate 14 × 3" — they are distinct questions.
 */
export function findDuplicate(
  candidateNormalized: string,
  candidateHash: string,
  existing: ExistingText[],
  threshold = 0.85,
): DuplicateMatch | null {
  // Fast path: exact hash (identical text incl. identical numbers)
  for (const e of existing) {
    if (e.textHash === candidateHash) {
      return { matchedQuestionId: e.id, similarity: 1, exact: true }
    }
  }
  // Fuzzy path: trigram similarity, with a numeric-variant exemption
  const candTri = trigramSet(candidateNormalized)
  const candNums = extractNumbers(candidateNormalized)
  const candSkelTri = trigramSet(skeleton(candidateNormalized))
  let best: DuplicateMatch | null = null
  for (const e of existing) {
    const eTri = e.trigrams ?? trigramSet(e.normalizedText)
    const sim = trigramSimilarity(candTri, eTri)
    if (sim <= threshold) continue

    // Same-template-but-different-numbers → distinct question, skip.
    if (!sameNumbers(candNums, extractNumbers(e.normalizedText))) {
      const skelSim = trigramSimilarity(candSkelTri, trigramSet(skeleton(e.normalizedText)))
      if (skelSim >= 0.95) continue
    }

    if (!best || sim > best.similarity) {
      best = { matchedQuestionId: e.id, similarity: sim, exact: false }
    }
  }
  return best
}
