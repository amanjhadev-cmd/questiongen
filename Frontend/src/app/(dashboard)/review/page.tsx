'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { statusColor, formatDate } from '@/lib/utils'
import type { Batch } from '@/types'
import { ClipboardList } from 'lucide-react'

export default function ReviewQueuePage() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ data: Batch[] }>('/batches?status=validation_complete,diagram_complete&limit=50')
      .then((res) => setBatches(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading…</div>

  return (
    <div className="p-8 space-y-6">
      <div className="page-header">
        <div>
          <h1>SME Review Queue</h1>
          <p className="text-sm text-gray-500 mt-1">{batches.length} batch(es) awaiting review</p>
        </div>
      </div>

      {batches.length === 0 && (
        <div className="card p-12 text-center text-gray-400">
          <ClipboardList size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No batches are currently awaiting SME review.</p>
        </div>
      )}

      <div className="space-y-3">
        {batches.map((b) => (
          <div key={b.id} className="card p-5 flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base font-semibold text-gray-800">{b.name}</h2>
                <span className={`badge ${statusColor(b.status)}`}>{b.status}</span>
              </div>
              <p className="text-sm text-gray-500">
                {b.subject.name} · {b.questionType.code} · {b.difficulty} · {b.questionCount} questions
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {b.chapter ? `Ch ${b.chapter.chapterNo} — ${b.chapter.name}` : 'All chapters'} · {formatDate(b.createdAt)}
              </p>
            </div>
            <Link href={`/review/${b.id}`} className="btn-primary flex-shrink-0">
              Start Review →
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
