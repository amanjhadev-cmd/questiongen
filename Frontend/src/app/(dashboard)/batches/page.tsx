'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { statusColor, statusLabel, formatDate } from '@/lib/utils'
import type { Batch, PaginatedResponse } from '@/types'

export default function BatchListPage() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const LIMIT = 20

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
    if (statusFilter) params.set('status', statusFilter)
    api.get<PaginatedResponse<Batch>>(`/batches?${params}`)
      .then((r) => { setBatches(r.data); setTotal(r.meta.total) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page, statusFilter])

  const statuses = [
    '', 'created', 'generation_complete', 'import_complete', 'validation_complete',
    'diagram_complete', 'sme_review_complete', 'export_complete', 'synced',
  ]

  return (
    <div className="p-8">
      <div className="page-header">
        <h1>Batches</h1>
        <Link href="/batches/new" className="btn-primary">+ New Batch</Link>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <label className="text-sm text-gray-600">Filter by status:</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="input !w-auto"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>{s ? statusLabel(s) : 'All statuses'}</option>
            ))}
          </select>
          <span className="text-sm text-gray-400 ml-auto">{total} batch{total !== 1 ? 'es' : ''}</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : batches.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No batches found.</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Name</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Subject</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Type / Difficulty</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Count</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Created by</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Date</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium">{b.name}</td>
                    <td className="px-6 py-4 text-gray-600">{b.subject.name}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {b.questionType.code} / {b.difficulty}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{b.questionCount}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${statusColor(b.status)}`}>{statusLabel(b.status)}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{b.createdBy.name}</td>
                    <td className="px-6 py-4 text-gray-500 text-xs">{formatDate(b.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/batches/${b.id}`} className="text-brand text-sm font-medium hover:underline">
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {total > LIMIT && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Page {page} of {Math.ceil(total / LIMIT)}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-xs px-3 py-1">
                    ← Prev
                  </button>
                  <button onClick={() => setPage((p) => p + 1)} disabled={page * LIMIT >= total} className="btn-secondary text-xs px-3 py-1">
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
