'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'
import { statusColor, statusLabel, formatDate } from '@/lib/utils'
import type { Batch, Question, User } from '@/types'
import { CheckCircle, XCircle, AlertCircle, Upload, FileJson, ImageIcon, UserCheck } from 'lucide-react'

export default function BatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [batch, setBatch] = useState<Batch | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState('')
  const [smes, setSmes] = useState<User[]>([])
  const [selectedSme, setSelectedSme] = useState('')
  const [assigning, setAssigning] = useState(false)

  const canAssign = user?.role === 'super_admin' || user?.role === 'admin'

  useEffect(() => {
    Promise.all([
      api.get<Batch>(`/batches/${id}`),
      api.get<Question[]>(`/batches/${id}/questions`),
    ]).then(([b, q]) => { setBatch(b); setQuestions(q); setSelectedSme(b.assignee?.id ?? '') })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!canAssign) return
    api.get<{ data: User[] }>('/users?role=sme')
      .then((r) => setSmes(r.data.filter((u) => u.isActive)))
      .catch(console.error)
  }, [canAssign])

  async function markGenerationComplete() {
    setAction('gen')
    try {
      const updated = await api.post<Batch>(`/batches/${id}/mark-generation-complete`)
      setBatch(updated)
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
    setAction('')
  }

  async function assignSme() {
    if (!selectedSme) return
    setAssigning(true)
    try {
      const updated = await api.post<Batch>(`/batches/${id}/send-to-review`, { smeId: selectedSme })
      setBatch(updated)
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
    setAssigning(false)
  }


  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading…</div>
  if (!batch) return <div className="p-8 text-red-500 text-sm">Batch not found.</div>

  const statusIndex = [
    'created', 'generation_complete', 'import_complete', 'validation_complete',
    'diagram_complete', 'sme_review_complete', 'export_complete', 'synced',
  ].indexOf(batch.status)

  const approved = questions.filter((q) => q.status === 'approved').length
  const rejected = questions.filter((q) => q.status === 'rejected').length
  const failed = questions.filter((q) => q.status === 'validation_failed').length

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <p className="text-sm text-gray-400 mb-1">
            <Link href="/batches" className="hover:underline">Batches</Link> / {batch.name}
          </p>
          <h1>{batch.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`badge ${statusColor(batch.status)}`}>{statusLabel(batch.status)}</span>
            <span className="text-sm text-gray-500">{batch.subject.name} · {batch.questionType.code} · {batch.difficulty} · {batch.questionCount} Qs</span>
          </div>
        </div>
      </div>

      {/* Progress steps */}
      <div className="card p-5">
        <p className="section-title">Pipeline Progress</p>
        <div className="flex items-center gap-0">
          {['Create', 'Generate', 'Import', 'Validate', 'Diagrams', 'Review', 'Export', 'Sync'].map((step, i) => (
            <div key={step} className="flex items-center">
              <div className={`flex flex-col items-center ${i <= statusIndex ? 'text-brand' : 'text-gray-300'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${i <= statusIndex ? 'bg-brand text-white border-brand' : 'border-gray-300 text-gray-300'}`}>
                  {i + 1}
                </div>
                <span className="text-xs mt-1 whitespace-nowrap">{step}</span>
              </div>
              {i < 7 && <div className={`h-0.5 w-8 mb-4 ${i < statusIndex ? 'bg-brand' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Actions */}
        <div className="card p-5 col-span-1">
          <p className="section-title">Actions</p>
          <div className="space-y-2">
            {batch.status === 'created' && (
              <>
                <Link href={`/batches/${id}/prompt`} className="btn-secondary w-full justify-center text-sm">
                  📋 View Prompt
                </Link>
                <button
                  onClick={markGenerationComplete}
                  disabled={action === 'gen'}
                  className="btn-primary w-full justify-center text-sm"
                >
                  {action === 'gen' ? 'Updating…' : '✓ Mark Generation Complete'}
                </button>
              </>
            )}

            {batch.status === 'generation_complete' && (
              <Link href={`/batches/${id}/import`} className="btn-primary w-full justify-center text-sm">
                <Upload size={15} /> Import Questions
              </Link>
            )}

            {['import_complete', 'validation_complete'].includes(batch.status) && (
              <Link href={`/batches/${id}/questions`} className="btn-secondary w-full justify-center text-sm">
                View Questions ({questions.length})
              </Link>
            )}

            {['validation_complete', 'diagram_complete'].includes(batch.status) && (
              <Link href={`/batches/${id}/diagrams`} className="btn-secondary w-full justify-center text-sm">
                <ImageIcon size={15} /> Manage Diagrams
              </Link>
            )}

            {batch.status === 'diagram_complete' && (
              <Link href={`/review/${id}`} className="btn-primary w-full justify-center text-sm">
                <CheckCircle size={15} /> Start SME Review
              </Link>
            )}

            {batch.status === 'validation_complete' && (
              <Link href={`/review/${id}`} className="btn-secondary w-full justify-center text-sm">
                <CheckCircle size={15} /> Start SME Review (skip diagrams)
              </Link>
            )}

            {batch.status === 'sme_review_complete' && (
              <Link href={`/batches/${id}/export`} className="btn-primary w-full justify-center text-sm">
                <FileJson size={15} /> Manage Exports
              </Link>
            )}

            {batch.status === 'export_complete' && (
              <Link href={`/batches/${id}/export`} className="btn-primary w-full justify-center text-sm">
                <Upload size={15} /> Sync to Production
              </Link>
            )}

            {batch.status === 'synced' && (
              <Link href={`/batches/${id}/export`} className="btn-secondary w-full justify-center text-sm">
                <CheckCircle size={15} /> View Exports
              </Link>
            )}
          </div>

          {/* SME reviewer assignment */}
          {canAssign && ['validation_complete', 'diagram_complete'].includes(batch.status) && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <p className="section-title flex items-center gap-1"><UserCheck size={13} /> Assign Reviewer</p>
              {batch.assignee && (
                <p className="text-xs text-gray-500">Currently: <span className="font-medium text-gray-700">{batch.assignee.name}</span></p>
              )}
              <select
                className="input text-sm"
                value={selectedSme}
                onChange={(e) => setSelectedSme(e.target.value)}
              >
                <option value="">Select an SME…</option>
                {smes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.subjects && s.subjects.length > 0 ? ` — ${s.subjects.map((x) => x.code).join(', ')}` : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={assignSme}
                disabled={!selectedSme || assigning || selectedSme === batch.assignee?.id}
                className="btn-secondary w-full justify-center text-sm"
              >
                {assigning ? 'Assigning…' : batch.assignee ? 'Reassign' : 'Assign to SME'}
              </button>
              {smes.length === 0 && <p className="text-xs text-orange-500">No active SME users. Create one in Users.</p>}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="card p-5 col-span-2">
          <p className="section-title">Question Stats</p>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total', value: questions.length, color: 'text-gray-700' },
              { label: 'Approved', value: approved, color: 'text-green-600' },
              { label: 'Rejected', value: rejected, color: 'text-red-500' },
              { label: 'Failed Validation', value: failed, color: 'text-orange-500' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 border-t border-gray-100 pt-4 text-sm text-gray-500 space-y-1">
            <p>Chapter: {batch.chapter ? `Ch ${batch.chapter.chapterNo} — ${batch.chapter.name}` : 'All chapters'}</p>
            <p>Created by: {batch.createdBy.name} · {formatDate(batch.createdAt)}</p>
            {batch.notes && <p className="italic text-gray-400">"{batch.notes}"</p>}
          </div>
        </div>
      </div>

      {/* Question list preview */}
      {questions.length > 0 && (
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold">Questions</h2>
            <Link href={`/batches/${id}/questions`} className="text-sm text-brand hover:underline">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {questions.slice(0, 5).map((q, i) => (
              <div key={q.id} className="px-6 py-3 flex items-start gap-3">
                <span className="text-gray-400 text-sm w-6 flex-shrink-0">{i + 1}.</span>
                <p className="text-sm text-gray-800 flex-1 line-clamp-2">{q.content.question_text}</p>
                <span className={`badge flex-shrink-0 ${statusColor(q.status)}`}>{q.status}</span>
              </div>
            ))}
            {questions.length > 5 && (
              <div className="px-6 py-3 text-sm text-gray-400 text-center">
                +{questions.length - 5} more questions
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
