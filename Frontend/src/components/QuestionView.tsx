'use client'
import type { QuestionContent } from '@/types'
import { statusColor } from '@/lib/utils'
import { RichText } from './RichText'

type Content = Record<string, unknown>

function itemText(x: unknown): string {
  if (x == null) return ''
  if (typeof x === 'string' || typeof x === 'number') return String(x)
  if (typeof x === 'object') {
    const o = x as Record<string, unknown>
    return String(o.text ?? o.value ?? o.label ?? o.name ?? JSON.stringify(o))
  }
  return String(x)
}

/**
 * Renders a validated question for all subjects + question types, with
 * HTML + KaTeX math (mhchem chemistry). Dispatches on the JSON shape:
 * nested production format ({metadata, question}) or flat legacy format.
 */
export function QuestionView({
  content,
  diagramUrl,
  showAnswers = true,
}: {
  content: Content
  diagramUrl?: string
  showAnswers?: boolean
}) {
  if (content.metadata && content.question) {
    return <NestedView meta={content.metadata as Content} q={content.question as Content} showAnswers={showAnswers} />
  }
  return <FlatView content={content as unknown as QuestionContent} diagramUrl={diagramUrl} showAnswers={showAnswers} />
}

// ── Nested production format ──────────────────────────────────────────────────
function NestedView({ meta, q, showAnswers }: { meta: Content; q: Content; showAnswers: boolean }) {
  const options = Array.isArray(q.options) ? (q.options as Array<Record<string, unknown>>) : []
  const finalAnswer = (q.final_answer ?? {}) as Record<string, unknown>
  const correctSet = new Set(
    (Array.isArray(finalAnswer.correct_options) ? finalAnswer.correct_options : []).map(
      (o: Record<string, unknown>) => String(o.option_number),
    ),
  )
  const answerText = finalAnswer.answer_text as string | null | undefined
  const concepts = Array.isArray(meta.concepts) ? (meta.concepts as Array<Record<string, unknown>>) : []
  const bloom = Array.isArray(meta.bloom) ? (meta.bloom as Array<Record<string, unknown>>) : []
  const diagramUrl = q.question_diagram_url as string | null | undefined

  return (
    <div className="space-y-4">
      <div className="text-base text-gray-900 leading-relaxed"><RichText html={String(q.question_text ?? '')} /></div>

      {diagramUrl && (
        <img src={diagramUrl} alt="Question diagram" draggable={false} onContextMenu={(e) => e.preventDefault()}
          className="max-h-64 rounded-lg border border-gray-200 object-contain" />
      )}

      {options.length > 0 && (
        <ul className="space-y-2">
          {options.map((o) => {
            const num = String(o.option_number)
            return (
              <li key={num} className={`text-sm px-3 py-2 rounded-lg border flex gap-2 ${
                showAnswers && correctSet.has(num) ? 'bg-green-50 border-green-300 font-medium' : 'border-gray-200'
              }`}>
                <span className="font-semibold flex-shrink-0">{num}.</span>
                <RichText html={String(o.option_text ?? '')} />
              </li>
            )
          })}
        </ul>
      )}

      {showAnswers && answerText && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-green-700 mb-1">Answer</p>
          <div className="text-sm text-green-900"><RichText html={String(answerText)} /></div>
        </div>
      )}

      {concepts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {concepts.map((c) => (
            <span key={String(c.concept_uuid)} className="badge bg-brand-muted text-brand text-xs">{String(c.concept_name)}</span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
        {meta.question_type ? <span className="badge bg-gray-100 text-gray-600">{String(meta.question_type)}</span> : null}
        {meta.question_level ? <span className="badge bg-gray-100 text-gray-500">{String(meta.question_level).replace(/^LEVEL_/i, '').toLowerCase()}</span> : null}
        {bloom.map((b, i) => <span key={i}>{String(b.bloom_level).toLowerCase()}</span>)}
        {meta.question_mark !== undefined ? <span>{String(meta.question_mark)} mark(s)</span> : null}
      </div>
    </div>
  )
}

// ── Flat legacy format ─────────────────────────────────────────────────────────
function FlatView({ content, diagramUrl, showAnswers }: { content: QuestionContent; diagramUrl?: string; showAnswers: boolean }) {
  const type = content.question_type
  return (
    <div className="space-y-4">
      {content.passage && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-400 mb-1">Passage</p>
          <div className="text-sm text-gray-700 leading-relaxed"><RichText text={content.passage} /></div>
        </div>
      )}

      <div className="text-base text-gray-900 leading-relaxed"><RichText text={content.question_text} /></div>

      {diagramUrl && (
        <img src={diagramUrl} alt="Question diagram" draggable={false} onContextMenu={(e) => e.preventDefault()}
          className="max-h-64 rounded-lg border border-gray-200 object-contain" />
      )}

      {type === 'MCQ' && content.options && (
        <ol type="A" className="space-y-2 ml-4 list-[upper-alpha]">
          {content.options.map((o) => (
            <li key={o.key} className={`text-sm px-3 py-2 rounded-lg border ${
              showAnswers && o.key === content.correct_option ? 'bg-green-50 border-green-300 font-medium' : 'border-gray-200'
            }`}>
              <RichText text={o.text} />
            </li>
          ))}
        </ol>
      )}

      {type === 'TF' && content.correct_answer !== undefined && showAnswers && (
        <p className="text-sm"><strong>Answer:</strong> {content.correct_answer ? 'True' : 'False'}</p>
      )}

      {type === 'FIB' && Array.isArray(content.blanks) && showAnswers && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-400">Blanks</p>
          {content.blanks.map((b, i) => (
            <p key={i} className="text-sm text-gray-700">
              <span className="text-gray-400">#{b.position ?? i + 1}:</span> <RichText text={b.answer} />
              {b.alternatives && b.alternatives.length > 0 && (
                <span className="text-gray-400 text-xs"> (also: {b.alternatives.join(', ')})</span>
              )}
            </p>
          ))}
        </div>
      )}

      {type === 'MATCH' && (Array.isArray(content.column_a) || Array.isArray(content.column_b)) && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-1">Column A</p>
              <ol className="space-y-1 list-decimal ml-5 text-sm text-gray-700">
                {(content.column_a ?? []).map((x, i) => <li key={i}><RichText text={itemText(x)} /></li>)}
              </ol>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-1">Column B</p>
              <ol className="space-y-1 list-[upper-alpha] ml-5 text-sm text-gray-700">
                {(content.column_b ?? []).map((x, i) => <li key={i}><RichText text={itemText(x)} /></li>)}
              </ol>
            </div>
          </div>
          {showAnswers && content.correct_matches && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(content.correct_matches).map(([a, b]) => (
                <span key={a} className="badge bg-green-50 text-green-700 border border-green-200">{a} → {b}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {Array.isArray(content.solution_steps) && content.solution_steps.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
          <p className="text-xs font-semibold text-indigo-600 mb-1">Solution</p>
          <ol className="space-y-1 list-decimal ml-5">
            {content.solution_steps.slice().sort((a, b) => (a.step_no ?? 0) - (b.step_no ?? 0)).map((s, i) => (
              <li key={i} className="text-sm text-indigo-900"><RichText text={s.content} /></li>
            ))}
          </ol>
        </div>
      )}

      {content.explanation && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-600 mb-1">Explanation</p>
          <div className="text-sm text-blue-800"><RichText text={content.explanation} /></div>
        </div>
      )}

      {content.hint && (
        <p className="text-xs text-gray-500"><span className="font-semibold">Hint:</span> <RichText text={content.hint} /></p>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
        {content.difficulty && <span className={`badge ${statusColor(content.difficulty)}`}>{content.difficulty}</span>}
        {content.bloom_level && <span>{content.bloom_level}</span>}
        {content.marks !== undefined && <span>{content.marks} mark(s)</span>}
        {content.is_ncert && <span className="badge bg-orange-100 text-orange-700">NCERT p.{content.ncert_page}</span>}
        {content.tags?.map((t) => <span key={t} className="badge bg-gray-100 text-gray-500">{t}</span>)}
      </div>
    </div>
  )
}
