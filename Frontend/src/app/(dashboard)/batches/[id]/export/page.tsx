'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { statusColor } from '@/lib/utils'
import type { Export, Batch } from '@/types'
import { ArrowLeft, FileJson, FileSpreadsheet, FileText, RefreshCw, Upload } from 'lucide-react'

export default function ExportPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [batch, setBatch] = useState<Pick<Batch, 'id' | 'name' | 'status'> | null>(null)
  const [exports, setExports] = useState<Export[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [markingComplete, setMarkingComplete] = useState(false)

  async function load() {
    const [b, e] = await Promise.all([
      api.get<Pick<Batch, 'id' | 'name' | 'status'>>(`/batches/${id}`),
      api.get<Export[]>(`/batches/${id}/exports`),
    ])
    setBatch(b)
    setExports(e)
  }

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [id])

  async function trigger(format: 'json' | 'excel' | 'pdf') {
    setTriggering(format)
    try {
      await api.post(`/batches/${id}/exports/${format}`, {})
      await load()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to trigger export')
    }
    setTriggering(null)
  }

  async function markComplete() {
    setMarkingComplete(true)
    try {
      await api.post(`/batches/${id}/exports/mark-complete`, {})
      await load()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed')
    }
    setMarkingComplete(false)
  }

  async function sync() {
    if (!confirm('Sync this batch to production via n8n? This cannot be undone.')) return
    setSyncing(true)
    try {
      await api.post(`/batches/${id}/sync`, {})
      router.push(`/batches/${id}`)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Sync failed')
      setSyncing(false)
    }
  }

  async function pushToSqs() {
    if (!confirm('Re-validate all questions and push them to the SQS queue? This cannot be undone.')) return
    setSyncing(true)
    try {
      const res = await api.post<{ pushed: number }>(`/batches/${id}/sqs-sync`, {})
      alert(`Pushed ${res.pushed} question(s) to the queue.`)
      router.push(`/batches/${id}`)
    } catch (e: unknown) {
      // Abort-before-push validation failures come back here with a clear message.
      alert(e instanceof Error ? e.message : 'SQS push failed')
      setSyncing(false)
    }
  }

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading…</div>
  if (!batch) return <div className="p-8 text-red-500 text-sm">Batch not found.</div>

  const hasAnyDone = exports.some((e) => e.status === 'done')
  const isExportComplete = batch.status === 'export_complete'
  const isSynced = batch.status === 'synced'

  const FORMAT_BUTTONS: Array<{ format: 'json' | 'excel' | 'pdf'; label: string; icon: React.ReactNode }> = [
    { format: 'json', label: 'JSON', icon: <FileJson size={18} /> },
    { format: 'excel', label: 'Excel', icon: <FileSpreadsheet size={18} /> },
    { format: 'pdf', label: 'PDF', icon: <FileText size={18} /> },
  ]

  return (
    <div className="p-8 space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href={`/batches/${id}`} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1>Export — {batch.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Status: <span className={`badge ${statusColor(batch.status)}`}>{batch.status}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Generate exports */}
      {!isSynced && (
        <div className="card p-5 space-y-4">
          <h2 className="text-base font-semibold">Generate Exports</h2>
          <div className="flex gap-3 flex-wrap">
            {FORMAT_BUTTONS.map(({ format, label, icon }) => {
              const existing = exports.find((e) => e.format === format)
              const isRunning = existing?.status === 'pending' || existing?.status === 'processing'
              return (
                <button
                  key={format}
                  onClick={() => trigger(format)}
                  disabled={!!triggering || isRunning}
                  className="btn-secondary flex items-center gap-2"
                >
                  {(triggering === format || isRunning) ? <RefreshCw size={16} className="animate-spin" /> : icon}
                  {isRunning ? `Generating ${label}…` : `Generate ${label}`}
                </button>
              )
            })}
          </div>

          {hasAnyDone && !isExportComplete && (
            <button
              onClick={markComplete}
              disabled={markingComplete}
              className="btn-secondary text-sm"
            >
              {markingComplete ? 'Marking…' : 'Mark Export Complete'}
            </button>
          )}
        </div>
      )}

      {/* Sync section */}
      {(isExportComplete || isSynced) && (
        <div className={`card p-5 flex items-center justify-between ${isSynced ? 'bg-green-50 border border-green-200' : ''}`}>
          <div>
            <p className="font-semibold text-sm">{isSynced ? 'Synced to Production' : 'Ready to Sync'}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {isSynced
                ? 'This batch has been sent to production.'
                : 'All exports generated. Push to production via n8n, or push each question to the SQS queue (re-validated first).'}
            </p>
          </div>
          {!isSynced && (
            <div className="flex items-center gap-2">
              <button onClick={pushToSqs} disabled={syncing} className="btn-secondary flex items-center gap-2">
                {syncing ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
                Push to SQS
              </button>
              <button onClick={sync} disabled={syncing} className="btn-primary flex items-center gap-2">
                {syncing ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
                {syncing ? 'Working…' : 'Sync via n8n'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Export history */}
      <div className="card divide-y divide-gray-50">
        <div className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider grid grid-cols-4">
          <span>Format</span>
          <span>Status</span>
          <span>Created</span>
          <span>Download</span>
        </div>
        {exports.length === 0 && (
          <p className="px-5 py-6 text-sm text-gray-400">No exports yet.</p>
        )}
        {exports.map((e) => (
          <div key={e.id} className="px-5 py-3 grid grid-cols-4 items-center text-sm">
            <span className="font-mono uppercase text-xs font-semibold text-brand">{e.format}</span>
            <span className={`badge w-fit ${statusColor(e.status)}`}>{e.status}</span>
            <span className="text-gray-500">{new Date(e.createdAt).toLocaleString()}</span>
            <span>
              {e.publicUrl && e.status === 'done' ? (
                <a
                  href={e.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:underline text-xs font-medium"
                >
                  Download
                </a>
              ) : (
                <span className="text-gray-300 text-xs">—</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
