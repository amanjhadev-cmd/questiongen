// Frontend mirror of the backend field adapter — knows where each field lives
// in both the nested production format and the flat legacy format.

type Content = Record<string, unknown>

export function isNested(content: Content): boolean {
  return !!content.metadata && !!content.question
}

export function getQuestionText(content: Content): string {
  const q = content.question as Content | undefined
  return String((q?.question_text ?? content.question_text ?? '') as string)
}

export function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function getDifficulty(content: Content): string {
  const m = content.metadata as Content | undefined
  if (m?.question_level) return String(m.question_level).replace(/^LEVEL_/i, '').toLowerCase()
  return content.difficulty ? String(content.difficulty) : ''
}

export function getBloom(content: Content): string {
  const m = content.metadata as Content | undefined
  const bloom = m?.bloom as Array<{ bloom_level?: unknown }> | undefined
  if (Array.isArray(bloom) && bloom[0]?.bloom_level) return String(bloom[0].bloom_level).toLowerCase()
  return content.bloom_level ? String(content.bloom_level).toLowerCase() : ''
}

export function getMarks(content: Content): number | undefined {
  const m = content.metadata as Content | undefined
  if (m?.question_mark !== undefined) return Number(m.question_mark)
  return content.marks !== undefined ? Number(content.marks) : undefined
}
