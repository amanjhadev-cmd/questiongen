'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { CheckCircle, XCircle } from 'lucide-react'

interface ImportResult {
  batchId: string
  total: number
  saved: number
  failed: number
  results: Array<{
    index: number
    questionId?: string
    valid: boolean
    errors: Array<{ pass: number; field: string; message: string }>
  }>
}

export default function ImportPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [raw, setRaw] = useState('')
  const [mode, setMode] = useState<'append' | 'replace'>('append')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')

  async function handleImport() {
    setError('')
    setResult(null)

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      setError('Invalid JSON — please paste valid JSON from Qwen.')
      return
    }

    setLoading(true)
    try {
      const res = await api.post<ImportResult>(`/batches/${id}/import`, { rawJson: parsed, mode })
      setResult(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div>
        <h1>Import Questions</h1>
        <p className="text-sm text-gray-500 mt-1">Paste the JSON output from Qwen below.</p>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <label className="label">Import Mode</label>
          <div className="flex gap-4">
            {(['append', 'replace'] as const).map((m) => (
              <label key={m} className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" value={m} checked={mode === m} onChange={() => setMode(m)} />
                <span className="capitalize">{m}</span>
                <span className="text-gray-400 text-xs">
                  {m === 'append' ? '(add to existing)' : '(replace failed questions)'}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="label">JSON from Qwen *</label>
          <textarea
            className="input font-mono text-xs h-64 resize-none"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={'[\n  {\n    "question_text": "...",\n    "question_type": "MCQ",\n    ...\n  }\n]'}
            spellCheck={false}
          />
          <p className="text-xs text-gray-400 mt-1">
            Accepts: JSON array of questions, object with a &quot;questions&quot; key, or a single question object.
          </p>
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button onClick={handleImport} disabled={loading || !raw.trim()} className="btn-primary">
            {loading ? 'Importing…' : 'Import Questions'}
          </button>
          <button onClick={() => router.back()} className="btn-secondary">Cancel</button>
        </div>
      </div>

      {result && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-700">{result.total}</p>
              <p className="text-xs text-gray-400">Total</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{result.saved}</p>
              <p className="text-xs text-gray-400">Validated</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-500">{result.failed}</p>
              <p className="text-xs text-gray-400">Failed</p>
            </div>
          </div>

          {result.failed === 0 ? (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle size={16} />
              All questions passed validation. Batch advanced to validation_complete.
            </div>
          ) : (
            <div className="flex items-center gap-2 text-orange-600 text-sm">
              <XCircle size={16} />
              {result.failed} question(s) failed validation. Fix them and re-import.
            </div>
          )}

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {result.results
              .filter((r) => !r.valid)
              .map((r) => (
                <div key={r.index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-600">Question #{r.index + 1}</p>
                  {r.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-700 mt-1">
                      Pass {e.pass} · <code>{e.field}</code>: {e.message}
                    </p>
                  ))}
                </div>
              ))}
          </div>

          {result.failed === 0 && (
            <button onClick={() => router.push(`/batches/${id}`)} className="btn-primary">
              Back to Batch →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
