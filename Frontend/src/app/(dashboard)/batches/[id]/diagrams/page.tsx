'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { statusColor } from '@/lib/utils'
import type { Question, QuestionContent, DiagramJob, DiagramAsset } from '@/types'
import { Upload, CheckCircle, Image } from 'lucide-react'

interface QuestionWithDiagram extends Question {
  diagramJobs: (DiagramJob & { assets: DiagramAsset[] })[]
}

export default function DiagramsPage() {
  const { id } = useParams<{ id: string }>()
  const [questions, setQuestions] = useState<QuestionWithDiagram[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  async function load() {
    try {
      const qs = await api.get<QuestionWithDiagram[]>(`/batches/${id}/questions?status=diagram_pending,diagram_done`)
      setQuestions(qs)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  async function handleUpload(jobId: string, file: File) {
    setUploading(jobId)
    try {
      const form = new FormData()
      form.append('diagram', file)
      await api.upload(`/diagrams/${jobId}/upload`, form)
      await load()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Upload failed')
    }
    setUploading(null)
  }

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading…</div>

  const pending = questions.filter((q) => q.status === 'diagram_pending').length
  const done = questions.filter((q) => q.status === 'diagram_done').length

  return (
    <div className="p-8 space-y-6">
      <div className="page-header">
        <div>
          <p className="text-sm text-gray-400 mb-1">
            <Link href={`/batches/${id}`} className="hover:underline">Batch</Link> / Diagrams
          </p>
          <h1>Diagram Upload</h1>
          <p className="text-sm text-gray-500 mt-1">{pending} pending · {done} uploaded</p>
        </div>
      </div>

      {questions.length === 0 && (
        <div className="card p-8 text-center text-gray-400 text-sm">
          No questions require diagrams in this batch.
        </div>
      )}

      <div className="space-y-4">
        {questions.map((q, i) => {
          const content = q.content as QuestionContent
          const job = q.diagramJobs?.[0]
          const activeAsset = job?.assets?.find((a) => a.isActive)
          const isDone = q.status === 'diagram_done'

          return (
            <div key={q.id} className="card p-5 space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-gray-400 text-sm w-6 flex-shrink-0 mt-0.5">{i + 1}.</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`badge ${statusColor(q.status)}`}>{q.status}</span>
                    {isDone && <CheckCircle size={14} className="text-green-500" />}
                  </div>
                  <p className="text-sm text-gray-800">{content.question_text}</p>
                  {content.diagram_description && (
                    <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded p-2">
                      <strong>Diagram description:</strong> {content.diagram_description}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {activeAsset && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500">Current Diagram (v{activeAsset.version})</p>
                    <img
                      src={activeAsset.publicUrl}
                      alt="Diagram"
                      className="max-w-full rounded-lg border border-gray-200 max-h-48 object-contain"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500">
                    {isDone ? 'Re-upload Diagram' : 'Upload Diagram'}
                  </p>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    className="hidden"
                    ref={(el) => { fileRefs.current[job?.id ?? ''] = el }}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f && job) handleUpload(job.id, f)
                    }}
                  />
                  <button
                    onClick={() => fileRefs.current[job?.id ?? '']?.click()}
                    disabled={uploading === job?.id || !job}
                    className="btn-secondary text-sm flex items-center gap-2"
                  >
                    {uploading === job?.id ? (
                      'Uploading…'
                    ) : (
                      <><Image size={14} /> {isDone ? 'Replace' : 'Upload PNG/JPG'}</>
                    )}
                  </button>
                  {!job && (
                    <p className="text-xs text-orange-500">No diagram job found for this question.</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
