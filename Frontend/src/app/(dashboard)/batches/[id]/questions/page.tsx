'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { statusColor, formatDate } from '@/lib/utils'
import { QuestionView } from '@/components/QuestionView'
import { getQuestionText, stripHtml, getDifficulty, getBloom, getMarks } from '@/lib/question-fields'
import type { Question } from '@/types'

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'staged', label: 'Staged' },
  { value: 'validation_failed', label: 'Failed' },
  { value: 'validated', label: 'Validated' },
  { value: 'diagram_pending', label: 'Diagram Pending' },
  { value: 'diagram_done', label: 'Diagram Done' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export default function BatchQuestionsPage() {
  const { id } = useParams<{ id: string }>()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    const url = statusFilter
      ? `/batches/${id}/questions?status=${statusFilter}`
      : `/batches/${id}/questions`
    api.get<Question[]>(url)
      .then(setQuestions)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id, statusFilter])

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading…</div>

  return (
    <div className="p-8 space-y-5">
      <div className="page-header">
        <div>
          <p className="text-sm text-gray-400 mb-1">
            <Link href={`/batches/${id}`} className="hover:underline">Batch</Link> / Questions
          </p>
          <h1>Questions ({questions.length})</h1>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(s.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              statusFilter === s.value
                ? 'bg-brand text-white border-brand'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {questions.length === 0 && (
          <div className="card p-8 text-center text-gray-400 text-sm">No questions match this filter.</div>
        )}
        {questions.map((q, i) => {
          const content = q.content as unknown as Record<string, unknown>
          const preview = stripHtml(getQuestionText(content))
          const difficulty = getDifficulty(content)
          const bloom = getBloom(content)
          const marks = getMarks(content)
          const isOpen = expanded === q.id
          return (
            <div key={q.id} className="card">
              <button
                className="w-full px-5 py-4 flex items-start gap-3 text-left"
                onClick={() => setExpanded(isOpen ? null : q.id)}
              >
                <span className="text-gray-400 text-sm w-6 flex-shrink-0 mt-0.5">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 line-clamp-2">{preview}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`badge ${statusColor(q.status)}`}>{q.status}</span>
                    {difficulty && <span className={`badge ${statusColor(difficulty)}`}>{difficulty}</span>}
                    {bloom && <span className="text-xs text-gray-400">{bloom}</span>}
                    {marks !== undefined && <span className="text-xs text-gray-400">{marks} mk</span>}
                  </div>
                </div>
                <span className="text-gray-300 text-xs mt-1">{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-4">
                  <QuestionView content={content} />

                  {q.status === 'validation_failed' && (q as Question & { importErrors?: unknown[] }).importErrors && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-red-600 mb-2">Validation Errors</p>
                      {((q as Question & { importErrors: Array<{ pass: number; field: string; message: string }> }).importErrors ?? []).map((e, ei) => (
                        <p key={ei} className="text-xs text-red-700">
                          Pass {e.pass} · <code>{e.field}</code>: {e.message}
                        </p>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-gray-400">ID: {q.id} · {formatDate(q.createdAt)}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
