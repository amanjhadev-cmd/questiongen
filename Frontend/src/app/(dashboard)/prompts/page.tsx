'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { statusColor, formatDate } from '@/lib/utils'
import type { Prompt, PromptVersion } from '@/types'
import { Plus } from 'lucide-react'

interface PromptWithVersions extends Prompt {
  versions: PromptVersion[]
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<PromptWithVersions[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<PromptWithVersions[]>('/prompts')
      .then(setPrompts)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading…</div>

  return (
    <div className="p-8 space-y-6">
      <div className="page-header">
        <h1>Prompt Library</h1>
        <Link href="/prompts/new" className="btn-primary">
          <Plus size={15} /> New Prompt
        </Link>
      </div>

      {prompts.length === 0 && (
        <div className="card p-8 text-center text-gray-400 text-sm">
          No prompts yet. Create one to get started.
        </div>
      )}

      <div className="space-y-3">
        {prompts.map((p) => {
          const published = p.versions.find((v) => v.status === 'published')
          return (
            <Link key={p.id} href={`/prompts/${p.id}`} className="card p-5 flex items-start justify-between gap-4 hover:border-brand transition-colors block">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-base font-semibold text-gray-800">{p.name}</h2>
                  {!p.isActive && <span className="badge bg-gray-100 text-gray-500">Archived</span>}
                </div>
                <p className="text-sm text-gray-500">{p.description}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span>{p.versions.length} version(s)</span>
                  {published && (
                    <span className="badge bg-green-100 text-green-700">
                      v{published.versionNo} published
                    </span>
                  )}
                  <span>{formatDate(p.createdAt)}</span>
                </div>
              </div>
              <span className="text-gray-300">→</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
