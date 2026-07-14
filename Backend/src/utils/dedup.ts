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

/**
 * Returns the best duplicate match for `candidate` against `existing`, or null.
 * A match is an exact hash hit, or trigram similarity strictly greater than
 * `threshold` (default 0.80).
 */
export function findDuplicate(
  candidateNormalized: string,
  candidateHash: string,
  existing: ExistingText[],
  threshold = 0.8,
): DuplicateMatch | null {
  // Fast path: exact hash
  for (const e of existing) {
    if (e.textHash === candidateHash) {
      return { matchedQuestionId: e.id, similarity: 1, exact: true }
    }
  }
  // Fuzzy path: trigram similarity
  const candTri = trigramSet(candidateNormalized)
  let best: DuplicateMatch | null = null
  for (const e of existing) {
    const eTri = e.trigrams ?? trigramSet(e.normalizedText)
    const sim = trigramSimilarity(candTri, eTri)
    if (sim > threshold && (!best || sim > best.similarity)) {
      best = { matchedQuestionId: e.id, similarity: sim, exact: false }
    }
  }
  return best
}
