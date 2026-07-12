'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { statusColor, formatDate } from '@/lib/utils'
import type { Prompt, PromptVersion } from '@/types'
import { ArrowLeft, Copy } from 'lucide-react'

interface PromptDetail extends Prompt {
  versions: PromptVersion[]
}

function extractVariables(text: string): string[] {
  const seen: Record<string, true> = {}
  const result: string[] = []
  const re = /\{\{(\w+)\}\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (!seen[m[1]]) { seen[m[1]] = true; result.push(m[1]) }
  }
  return result
}

export default function PromptVersionPage() {
  const { id, versionId } = useParams<{ id: string; versionId: string }>()
  const router = useRouter()
  const [prompt, setPrompt] = useState<PromptDetail | null>(null)
  const [version, setVersion] = useState<PromptVersion | null>(null)
  const [loading, setLoading] = useState(true)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionPending, setActionPending] = useState(false)
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    const p = await api.get<PromptDetail>(`/prompts/${id}`)
    setPrompt(p)
    const v = p.versions.find((x) => x.id === versionId) ?? null
    setVersion(v)
    if (v) {
      setEditContent(v.content)
      const vars = extractVariables(v.content)
      setPreviewVars(Object.fromEntries(vars.map((k) => [k, ''])))
    }
  }, [id, versionId])

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)) }, [load])

  async function saveContent() {
    setSaving(true)
    try {
      // Adding a new version preserves the old draft — there's no PUT for content, so we create a new version
      await api.post(`/prompts/${id}/versions`, { content: editContent })
      router.push(`/prompts/${id}`)
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
    setSaving(false)
  }

  async function updateStatus(status: 'published' | 'archived') {
    setActionPending(true)
    try {
      await api.patch(`/prompts/${id}/versions/${versionId}/status`, { status })
      await load()
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
    setActionPending(false)
  }

  async function duplicateVersion() {
    setSaving(true)
    try {
      await api.post(`/prompts/${id}/versions`, { content: version!.content })
      router.push(`/prompts/${id}`)
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
    setSaving(false)
  }

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading…</div>
  if (!prompt || !version) return <div className="p-8 text-red-500 text-sm">Version not found.</div>

  const isDraft = version.status === 'draft'
  const vars = extractVariables(version.content)

  const interpolated = version.content.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    previewVars[key] || `{{${key}}}`,
  )

  return (
    <div className="p-8 max-w-5xl space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href={`/prompts/${id}`} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1>{prompt.name} — Version {version.versionNo}</h1>
            <p className="text-xs text-gray-400 mt-0.5">{formatDate(version.createdAt)}</p>
          </div>
          <span className={`badge ${statusColor(version.status)}`}>{version.status}</span>
        </div>
        <div className="flex gap-2">
          {isDraft && (
            <button
              onClick={() => updateStatus('published')}
              disabled={actionPending}
              className="btn-primary"
            >
              {actionPending ? 'Publishing…' : 'Publish'}
            </button>
          )}
          {version.status === 'published' && (
            <button
              onClick={() => updateStatus('archived')}
              disabled={actionPending}
              className="btn-secondary"
            >
              {actionPending ? '…' : 'Archive'}
            </button>
          )}
          <button onClick={duplicateVersion} disabled={saving} className="btn-secondary flex items-center gap-1.5">
            <Copy size={14} /> Duplicate as New Version
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Content editor */}
        <div className="space-y-3">
          <label className="label">Prompt Content</label>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            readOnly={!isDraft}
            className={`input font-mono text-xs h-80 resize-y ${!isDraft ? 'bg-gray-50 cursor-default' : ''}`}
            spellCheck={false}
          />
          {isDraft && (
            <div className="flex gap-2">
              <button onClick={saveContent} disabled={saving || editContent === version.content} className="btn-primary text-sm">
                {saving ? 'Saving…' : 'Save as New Version'}
              </button>
            </div>
          )}
          {!isDraft && (
            <p className="text-xs text-gray-400">Published and archived versions are read-only. Duplicate to edit.</p>
          )}
        </div>

        {/* Variables + preview */}
        <div className="space-y-4">
          {/* Detected variables */}
          {vars.length > 0 && (
            <div className="card p-4 space-y-3">
              <p className="text-sm font-semibold">Variables Detected</p>
              <div className="flex flex-wrap gap-2">
                {vars.map((v) => (
                  <span key={v} className="badge bg-brand-muted text-brand font-mono text-xs">
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Live preview */}
          {vars.length > 0 && (
            <div className="card p-4 space-y-3">
              <p className="text-sm font-semibold">Live Preview</p>
              <div className="space-y-2">
                {vars.map((v) => (
                  <div key={v} className="flex items-center gap-2">
                    <label className="text-xs font-mono text-gray-500 w-36 flex-shrink-0">{`{{${v}}}`}</label>
                    <input
                      className="input text-xs py-1 flex-1"
                      placeholder={`value for ${v}`}
                      value={previewVars[v] ?? ''}
                      onChange={(e) => setPreviewVars((p) => ({ ...p, [v]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                {interpolated}
              </div>
            </div>
          )}

          {/* Version selector */}
          <div className="card p-4 space-y-2">
            <p className="text-sm font-semibold">All Versions</p>
            {prompt.versions.map((v) => (
              <Link
                key={v.id}
                href={`/prompts/${id}/versions/${v.id}`}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${v.id === versionId ? 'bg-brand text-white' : 'hover:bg-gray-50'}`}
              >
                <span>Version {v.versionNo}</span>
                <span className={`badge text-xs ${v.id === versionId ? 'bg-white/20 text-white' : statusColor(v.status)}`}>
                  {v.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
