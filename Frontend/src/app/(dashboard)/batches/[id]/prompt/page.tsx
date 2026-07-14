'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import type { PromptPreview } from '@/types'
import { Copy, CheckCheck } from 'lucide-react'

export default function BatchPromptPage() {
  const { id } = useParams<{ id: string }>()
  const [preview, setPreview] = useState<PromptPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [bloomLevel, setBloomLevel] = useState('understand')

  useEffect(() => {
    api.get<PromptPreview>(`/batches/${id}/prompt-preview`)
      .then(setPreview)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const finalPrompt = preview?.interpolatedPrompt.replace('{{bloom_level}}', bloomLevel) ?? ''

  function copyPrompt() {
    navigator.clipboard.writeText(finalPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading prompt…</div>
  if (error) return <div className="p-8 text-red-500 text-sm">Error: {error}</div>
  if (!preview) return null

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div>
        <h1>Prompt Preview</h1>
        <p className="text-sm text-gray-500 mt-1">
          Batch: {preview.batchName} · Prompt v{preview.promptVersionNo}
        </p>
      </div>

      {/* Feature flags */}
      <div className="card p-4">
        <p className="section-title">Subject Feature Flags</p>
        <div className="flex flex-wrap gap-3">
          {Object.entries(preview.featureFlags).map(([k, v]) => (
            <span key={k} className={`badge ${v ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {k.replace(/([A-Z])/g, ' $1').toLowerCase()}: {String(v)}
            </span>
          ))}
        </div>
      </div>

      {/* Duplicate-avoidance context */}
      {preview.dedup && preview.dedup.existingCount > 0 && (
        <div className="card p-4 border border-amber-200 bg-amber-50/40">
          <p className="section-title text-amber-700">Duplicate Avoidance</p>
          <p className="text-sm text-amber-800">
            This chapter already has <strong>{preview.dedup.existingCount}</strong> question(s).
            The prompt below embeds coverage + a sample of existing stems so the LLM avoids repeats.
            The importer auto-rejects anything &gt;80% similar.
          </p>
          {preview.dedup.conceptCoverage.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs font-semibold text-amber-700">Least-covered concepts (target these):</p>
              <div className="flex flex-wrap gap-1.5">
                {preview.dedup.conceptCoverage
                  .slice()
                  .sort((a, b) => a.count - b.count)
                  .slice(0, 8)
                  .map((c) => (
                    <span key={c.uuid} className="badge bg-white border border-amber-200 text-amber-800 text-xs">
                      {c.name}: {c.count}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bloom level selector */}
      <div className="card p-4">
        <label className="label">Bloom&apos;s Taxonomy Level (select before copying)</label>
        <select
          className="input !w-64"
          value={bloomLevel}
          onChange={(e) => setBloomLevel(e.target.value)}
        >
          {['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'].map((b) => (
            <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Interpolated prompt */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold">Interpolated Prompt</h2>
          <button onClick={copyPrompt} className="btn-secondary text-sm">
            {copied ? <><CheckCheck size={15} className="text-green-600" /> Copied!</> : <><Copy size={15} /> Copy prompt</>}
          </button>
        </div>
        <pre className="p-5 text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 rounded-b-xl overflow-x-auto">
          {finalPrompt}
        </pre>
      </div>

      {/* Concepts */}
      {preview.concepts.length > 0 && (
        <div className="card p-5">
          <p className="section-title">Concepts in this Chapter ({preview.concepts.length})</p>
          <div className="space-y-3">
            {preview.concepts.map((c) => (
              <div key={c.uuid} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-brand bg-brand-muted px-2 py-0.5 rounded">{c.uuid}</span>
                  <span className="text-sm font-medium text-gray-800">{c.name}</span>
                </div>
                {c.shortNote && (
                  <p className="text-xs text-gray-500 mt-1 ml-1">{c.shortNote}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <strong>Next step:</strong> Copy the prompt above and paste it into Qwen Chat (or another LLM).
        After generation is complete, come back and mark the batch as &quot;Generation Complete&quot;, then import the JSON.
      </div>
    </div>
  )
}
