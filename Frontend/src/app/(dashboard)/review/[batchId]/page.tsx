'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'
import { ProtectedContent } from '@/components/ProtectedContent'
import { QuestionView } from '@/components/QuestionView'
import { statusColor } from '@/lib/utils'
import type { Question, QuestionContent } from '@/types'
import { CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react'

interface DiagramAssetLite { publicUrl: string; isActive: boolean; version: number }
interface ReviewQuestion extends Question {
  smeReviews: Array<{ decision: string; notes?: string; reviewedBy: { name: string } }>
  diagramJobs?: Array<{ assets: DiagramAssetLite[] }>
}

interface BatchReview {
  id: string
  name: string
  status: string
  questions: ReviewQuestion[]
}

export default function ReviewPage() {
  const { batchId } = useParams<{ batchId: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [batch, setBatch] = useState<BatchReview | null>(null)
  const [idx, setIdx] = useState(0)
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [batchNotes, setBatchNotes] = useState('')
  const [submittingBatch, setSubmittingBatch] = useState(false)

  useEffect(() => {
    api.get<BatchReview>(`/batches/${batchId}/review`)
      .then(setBatch)
      .catch(console.error)
  }, [batchId])

  const question = batch?.questions[idx]
  const content = question?.content as QuestionContent | undefined
  const latestReview = question?.smeReviews?.[0]
  const activeDiagram = question?.diagramJobs?.[0]?.assets?.find((a) => a.isActive)

  useEffect(() => {
    if (latestReview) {
      setDecision(latestReview.decision as 'approved' | 'rejected')
      setNotes(latestReview.notes ?? '')
    } else {
      setDecision(null)
      setNotes('')
    }
  }, [idx, latestReview?.decision])

  async function submitReview() {
    if (!question || !decision) return
    if (decision === 'rejected' && !notes.trim()) {
      alert('Notes are required when rejecting a question.')
      return
    }
    setSubmitting(true)
    try {
      await api.post(`/questions/${question.id}/review`, { decision, notes: notes || undefined })
      // Refresh batch
      const updated = await api.get<BatchReview>(`/batches/${batchId}/review`)
      setBatch(updated)
      // Move to next unreviewed
      const nextUnreviewed = updated.questions.findIndex(
        (q, i) => i > idx && q.smeReviews.length === 0,
      )
      if (nextUnreviewed !== -1) setIdx(nextUnreviewed)
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
    setSubmitting(false)
  }

  async function submitBatchReview() {
    setSubmittingBatch(true)
    try {
      await api.post(`/batches/${batchId}/review/submit`, { batchNotes: batchNotes || undefined })
      router.push(`/batches/${batchId}`)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Submit failed')
      setSubmittingBatch(false)
    }
  }

  if (!batch) return <div className="p-8 text-gray-400 text-sm">Loading…</div>

  const total = batch.questions.length
  const reviewed = batch.questions.filter((q) => q.smeReviews.length > 0).length
  const pct = total > 0 ? Math.round((reviewed / total) * 100) : 0

  return (
    <div className="p-8 space-y-6">
      <div className="page-header">
        <div>
          <h1>SME Review: {batch.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{reviewed}/{total} reviewed · {pct}% complete</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-brand h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>

      {/* Question navigator */}
      <div className="flex items-center gap-1 flex-wrap">
        {batch.questions.map((q, i) => {
          const rev = q.smeReviews[0]
          const bg = rev
            ? rev.decision === 'approved' ? 'bg-green-500' : 'bg-red-500'
            : i === idx ? 'bg-brand' : 'bg-gray-200'
          return (
            <button
              key={q.id}
              onClick={() => setIdx(i)}
              className={`w-8 h-8 rounded text-xs font-bold text-white ${bg}`}
              title={`Q${i + 1}: ${q.status}`}
            >
              {i + 1}
            </button>
          )
        })}
      </div>

      {question && content && (
        <ProtectedContent email={user?.email ?? 'unknown'}>
        <div className="grid grid-cols-3 gap-6">
          {/* Question panel */}
          <div className="card p-6 col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-500">Q{idx + 1} of {total}</span>
              <span className={`badge ${statusColor(question.status)}`}>{question.status}</span>
            </div>

            <QuestionView content={content} diagramUrl={activeDiagram?.publicUrl} />
          </div>

          {/* Review panel */}
          <div className="space-y-4">
            <div className="card p-5 space-y-4">
              <h2 className="text-base font-semibold">Your Decision</h2>

              <div className="flex gap-3">
                <button
                  onClick={() => setDecision('approved')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${decision === 'approved' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:border-green-300'}`}
                >
                  <CheckCircle size={16} /> Approve
                </button>
                <button
                  onClick={() => setDecision('rejected')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${decision === 'rejected' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:border-red-300'}`}
                >
                  <XCircle size={16} /> Reject
                </button>
              </div>

              {(decision === 'rejected' || notes) && (
                <div>
                  <label className="label">
                    Notes {decision === 'rejected' ? '(required)' : '(optional)'}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input h-24 resize-none text-sm"
                    placeholder="Reason for rejection or feedback…"
                  />
                </div>
              )}

              <button
                onClick={submitReview}
                disabled={!decision || submitting}
                className="btn-primary w-full justify-center"
              >
                {submitting ? 'Saving…' : 'Save Decision'}
              </button>

              <div className="flex gap-2">
                <button disabled={idx === 0} onClick={() => setIdx((i) => i - 1)} className="btn-secondary flex-1 justify-center">
                  <ChevronLeft size={15} /> Prev
                </button>
                <button disabled={idx === total - 1} onClick={() => setIdx((i) => i + 1)} className="btn-secondary flex-1 justify-center">
                  Next <ChevronRight size={15} />
                </button>
              </div>
            </div>

            {reviewed === total && (
              <div className="card p-5 space-y-3 border-2 border-green-200">
                <p className="text-sm font-semibold text-green-700">All questions reviewed!</p>
                <textarea
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  className="input h-20 resize-none text-sm"
                  placeholder="Final batch notes (optional)…"
                />
                <button
                  onClick={submitBatchReview}
                  disabled={submittingBatch}
                  className="btn-primary w-full justify-center"
                >
                  {submittingBatch ? 'Submitting…' : 'Submit Review & Complete'}
                </button>
              </div>
            )}
          </div>
        </div>
        </ProtectedContent>
      )}
    </div>
  )
}
