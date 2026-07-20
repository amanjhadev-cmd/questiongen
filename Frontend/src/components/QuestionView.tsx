'use client'
import type { QuestionContent } from '@/types'
import { statusColor } from '@/lib/utils'
import { RichText } from './RichText'

function itemText(x: unknown): string {
  if (x == null) return ''
  if (typeof x === 'string' || typeof x === 'number') return String(x)
  if (typeof x === 'object') {
    const o = x as Record<string, unknown>
    return String(o.text ?? o.value ?? o.label ?? o.name ?? JSON.stringify(o))
  }
  return String(x)
}
function itemKey(x: unknown, i: number): string {
  if (x && typeof x === 'object') {
    const o = x as Record<string, unknown>
    return String(o.key ?? o.id ?? o.label ?? i)
  }
  return String(i)
}

/**
 * Renders a validated question for all subjects and every question type, with
 * KaTeX math / mhchem chemistry via <RichText>. Shows answers when showAnswers.
 */
export function QuestionView({
  content,
  diagramUrl,
  showAnswers = true,
}: {
  content: QuestionContent
  diagramUrl?: string
  showAnswers?: boolean
}) {
  const type = content.question_type

  return (
    <div className="space-y-4">
      {/* Passage (English / comprehension) */}
      {content.passage && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-400 mb-1">Passage</p>
          <div className="text-sm text-gray-700 leading-relaxed"><RichText text={content.passage} /></div>
        </div>
      )}

      {/* Question */}
      <div className="text-base text-gray-900 leading-relaxed"><RichText text={content.question_text} /></div>

      {/* Diagram */}
      {diagramUrl && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-400">Diagram</p>
          <img
            src={diagramUrl}
            alt="Question diagram"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            className="max-h-64 rounded-lg border border-gray-200 object-contain"
          />
        </div>
      )}

      {/* MCQ options */}
      {type === 'MCQ' && content.options && (
        <ol type="A" className="space-y-2 ml-4 list-[upper-alpha]">
          {content.options.map((o) => (
            <li
              key={o.key}
              className={`text-sm px-3 py-2 rounded-lg border ${
                showAnswers && o.key === content.correct_option
                  ? 'bg-green-50 border-green-300 font-medium'
                  : 'border-gray-200'
              }`}
            >
              <RichText text={o.text} />
            </li>
          ))}
        </ol>
      )}

      {/* True / False */}
      {type === 'TF' && content.correct_answer !== undefined && showAnswers && (
        <p className="text-sm"><strong>Answer:</strong> {content.correct_answer ? 'True' : 'False'}</p>
      )}

      {/* Fill in the blanks */}
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

      {/* Match the following */}
      {type === 'MATCH' && (Array.isArray(content.column_a) || Array.isArray(content.column_b)) && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-1">Column A</p>
              <ol className="space-y-1 list-decimal ml-5 text-sm text-gray-700">
                {(content.column_a ?? []).map((x, i) => <li key={itemKey(x, i)}><RichText text={itemText(x)} /></li>)}
              </ol>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-1">Column B</p>
              <ol className="space-y-1 list-[upper-alpha] ml-5 text-sm text-gray-700">
                {(content.column_b ?? []).map((x, i) => <li key={itemKey(x, i)}><RichText text={itemText(x)} /></li>)}
              </ol>
            </div>
          </div>
          {showAnswers && content.correct_matches && (
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-1">Correct matches</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(content.correct_matches).map(([a, b]) => (
                  <span key={a} className="badge bg-green-50 text-green-700 border border-green-200">{a} → {b}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Solution steps (any type) */}
      {Array.isArray(content.solution_steps) && content.solution_steps.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
          <p className="text-xs font-semibold text-indigo-600 mb-1">Solution</p>
          <ol className="space-y-1 list-decimal ml-5">
            {content.solution_steps
              .slice()
              .sort((a, b) => (a.step_no ?? 0) - (b.step_no ?? 0))
              .map((s, i) => <li key={i} className="text-sm text-indigo-900"><RichText text={s.content} /></li>)}
          </ol>
        </div>
      )}

      {/* Explanation */}
      {content.explanation && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-600 mb-1">Explanation</p>
          <div className="text-sm text-blue-800"><RichText text={content.explanation} /></div>
        </div>
      )}

      {/* Hint */}
      {content.hint && (
        <p className="text-xs text-gray-500"><span className="font-semibold">Hint:</span> <RichText text={content.hint} /></p>
      )}

      {/* Meta */}
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
