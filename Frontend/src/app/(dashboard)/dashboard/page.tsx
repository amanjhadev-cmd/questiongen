'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api'
import { statusLabel, statusColor, formatDate } from '@/lib/utils'
import type { Batch, PaginatedResponse } from '@/types'
import Link from 'next/link'

export default function DashboardPage() {
  const { user } = useAuth()
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<PaginatedResponse<Batch>>('/batches?limit=10')
      .then((r) => setBatches(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-8">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.name}</p>
        </div>
        <Link href="/batches/new" className="btn-primary">
          + New Batch
        </Link>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold">Recent Batches</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : batches.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400 text-sm">No batches yet.</p>
            <Link href="/batches/new" className="btn-primary mt-4 inline-flex">
              Create your first batch
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Name</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Subject</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Type</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Created</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{b.name}</td>
                  <td className="px-6 py-4 text-gray-600">{b.subject.name}</td>
                  <td className="px-6 py-4 text-gray-600">{b.questionType.code}</td>
                  <td className="px-6 py-4">
                    <span className={`badge ${statusColor(b.status)}`}>
                      {statusLabel(b.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{formatDate(b.createdAt)}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/batches/${b.id}`} className="text-brand text-sm font-medium hover:underline">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
