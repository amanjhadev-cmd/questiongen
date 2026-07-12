'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export default function NewPromptPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [templateText, setTemplateText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name || !templateText) {
      setError('Name and template text are required.')
      return
    }
    setLoading(true)
    try {
      const prompt = await api.post<{ id: string }>('/prompts', { name, description: description || undefined, content: templateText })
      router.push(`/prompts/${prompt.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create prompt')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="page-header">
        <h1>New Prompt</h1>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div>
          <label className="label">Prompt Name *</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. MCQ Generator v1"
            required
          />
        </div>

        <div>
          <label className="label">Description</label>
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this prompt's purpose"
          />
        </div>

        <div>
          <label className="label">Template Text *</label>
          <p className="text-xs text-gray-400 mb-2">
            Use <code>{'{{variable}}'}</code> placeholders. Available: subject, class, board, chapter, concept_list, schema, bloom_level, question_count, difficulty.
          </p>
          <textarea
            className="input font-mono text-xs h-64 resize-y"
            value={templateText}
            onChange={(e) => setTemplateText(e.target.value)}
            placeholder="You are a question bank expert. Generate {{question_count}} {{difficulty}} level {{bloom_level}} MCQ questions for..."
            spellCheck={false}
            required
          />
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating…' : 'Create Prompt'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
