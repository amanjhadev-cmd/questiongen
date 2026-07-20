import { normalizeText, hashText, trigramSet, trigramSimilarity, findDuplicate, type ExistingText } from '../utils/dedup'

function mk(text: string): ExistingText {
  const n = normalizeText(text)
  return { id: text.slice(0, 24), normalizedText: n, textHash: hashText(n) }
}
function sim(a: string, b: string): number {
  return trigramSimilarity(trigramSet(normalizeText(a)), trigramSet(normalizeText(b)))
}

describe('normalizeText', () => {
  it('lowercases, strips punctuation, collapses whitespace', () => {
    expect(normalizeText('  What  IS a Combination-Reaction?! ')).toBe('what is a combination reaction')
  })
})

describe('trigramSimilarity', () => {
  it('is 1 for identical text', () => {
    expect(sim('a combination reaction', 'a combination reaction')).toBe(1)
  })
  it('is high for case/punctuation-only differences', () => {
    expect(sim('What is a combination reaction?', 'what is a COMBINATION reaction')).toBeGreaterThan(0.95)
  })
  it('is low for unrelated text', () => {
    expect(sim('define decomposition reaction', 'the mitochondria is the powerhouse')).toBeLessThan(0.3)
  })
})

describe('findDuplicate', () => {
  const bank = [mk('What is a combination reaction'), mk('Calculate the value of 12 times 3')]

  it('flags an exact (normalized) duplicate', () => {
    const n = normalizeText('What is a combination reaction!!')
    const d = findDuplicate(n, hashText(n), bank)
    expect(d).not.toBeNull()
    expect(d?.exact).toBe(true)
  })

  it('flags a genuine near-duplicate above threshold', () => {
    const n = normalizeText('What is combination reaction') // dropped "a"
    const d = findDuplicate(n, hashText(n), bank)
    expect(d).not.toBeNull()
    expect(d?.similarity).toBeGreaterThan(0.85)
  })

  it('keeps a numeric variant (same template, different numbers)', () => {
    const n = normalizeText('Calculate the value of 14 times 3')
    const d = findDuplicate(n, hashText(n), bank)
    expect(d).toBeNull()
  })

  it('keeps a genuinely reworded question', () => {
    const n = normalizeText('Define combination reaction with an example')
    const d = findDuplicate(n, hashText(n), bank)
    expect(d).toBeNull()
  })

  it('keeps unrelated content', () => {
    const n = normalizeText('State the law of conservation of mass')
    const d = findDuplicate(n, hashText(n), bank)
    expect(d).toBeNull()
  })
})
