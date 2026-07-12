'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { statusColor, formatDate } from '@/lib/utils'
import type { Prompt, PromptVersion } from '@/types'
import { Plus, Archive } from 'lucide-react'

interface PromptDetail extends Prompt {
  versions: PromptVersion[]
}

export default function PromptDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [prompt, setPrompt] = useState<PromptDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNewVersion, setShowNewVersion] = useState(false)
  const [newText, setNewText] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState('')

  async function load() {
    try {
      const p = await api.get<PromptDetail>(`/prompts/${id}`)
      setPrompt(p)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  async function addVersion() {
    if (!newText.trim()) return
    setSaving(true)
    try {
      await api.post(`/prompts/${id}/versions`, { content: newText })
      setNewText('')
      setShowNewVersion(false)
      await load()
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
    setSaving(false)
  }

  async function updateStatus(versionId: string, status: 'published' | 'archived') {
    setActionId(versionId)
    try {
      await api.patch(`/prompts/${id}/versions/${versionId}/status`, { status })
      await load()
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
    setActionId('')
  }

  async function archivePrompt() {
    if (!confirm('Archive this prompt? It will no longer be selectable for new subject profiles.')) return
    try {
      await api.post(`/prompts/${id}/archive`)
      router.push('/prompts')
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
  }

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading…</div>
  if (!prompt) return <div className="p-8 text-red-500 text-sm">Prompt not found.</div>

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div className="page-header">
        <div>
          <h1>{prompt.name}</h1>
          {prompt.description && <p className="text-sm text-gray-500 mt-1">{prompt.description}</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowNewVersion(true)} className="btn-secondary">
            <Plus size={15} /> Add Version
          </button>
          {prompt.isActive && (
            <button onClick={archivePrompt} className="btn-danger">
              <Archive size={15} /> Archive
            </button>
          )}
        </div>
      </div>

      {showNewVersion && (
        <div className="card p-5 space-y-4 border-2 border-brand">
          <h2 className="text-base font-semibold">New Version</h2>
          <textarea
            className="input font-mono text-xs h-48 resize-y"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Paste the updated prompt template text…"
            spellCheck={false}
          />
          <div className="flex gap-2">
            <button onClick={addVersion} disabled={saving || !newText.trim()} className="btn-primary">
              {saving ? 'Saving…' : 'Save Version'}
            </button>
            <button onClick={() => { setShowNewVersion(false); setNewText('') }} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {prompt.versions.map((v) => (
          <div key={v.id} className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">Version {v.versionNo}</span>
                <span className={`badge ${statusColor(v.status)}`}>{v.status}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{formatDate(v.createdAt)}</span>
                <Link href={`/prompts/${id}/versions/${v.id}`} className="btn-secondary text-xs py-1">
                  View
                </Link>
                {v.status === 'draft' && (
                  <button
                    onClick={() => updateStatus(v.id, 'published')}
                    disabled={actionId === v.id}
                    className="btn-primary text-xs py-1"
                  >
                    Publish
                  </button>
                )}
                {v.status === 'published' && (
                  <button
                    onClick={() => updateStatus(v.id, 'archived')}
                    disabled={actionId === v.id}
                    className="btn-secondary text-xs py-1"
                  >
                    Archive
                  </button>
                )}
              </div>
            </div>
            <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap font-mono overflow-x-auto max-h-48 overflow-y-auto">
              {v.content}
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}
