'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import type { Subject, Chapter, QuestionType } from '@/types'

export default function NewBatchPage() {
  const router = useRouter()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    subjectId: '',
    chapterId: '',
    questionTypeId: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    questionCount: 20,
    notes: '',
  })

  useEffect(() => {
    Promise.all([
      api.get<Subject[]>('/master/subjects'),
      api.get<QuestionType[]>('/master/question-types'),
    ]).then(([subs, qts]) => {
      setSubjects(subs)
      setQuestionTypes(qts)
    }).catch(console.error)
  }, [])

  useEffect(() => {
    if (!form.subjectId) { setChapters([]); return }
    api.get<Chapter[]>(`/master/chapters?subjectId=${form.subjectId}`)
      .then(setChapters)
      .catch(console.error)
  }, [form.subjectId])

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name || !form.subjectId || !form.questionTypeId) {
      setError('Please fill all required fields')
      return
    }
    setLoading(true)
    try {
      const body = {
        name: form.name,
        subjectId: form.subjectId,
        chapterId: form.chapterId || undefined,
        questionTypeId: form.questionTypeId,
        difficulty: form.difficulty,
        questionCount: form.questionCount,
        notes: form.notes || undefined,
      }
      const batch = await api.post<{ id: string }>('/batches', body)
      router.push(`/batches/${batch.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create batch')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="page-header">
        <h1>New Batch</h1>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div>
          <label className="label">Batch Name *</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Science Ch1 MCQ Batch 1"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Subject *</label>
            <select
              className="input"
              value={form.subjectId}
              onChange={(e) => { set('subjectId', e.target.value); set('chapterId', '') }}
              required
            >
              <option value="">Select subject…</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Chapter</label>
            <select
              className="input"
              value={form.chapterId}
              onChange={(e) => set('chapterId', e.target.value)}
              disabled={chapters.length === 0}
            >
              <option value="">All chapters</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>Ch {c.chapterNo}: {c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Question Type *</label>
            <select
              className="input"
              value={form.questionTypeId}
              onChange={(e) => set('questionTypeId', e.target.value)}
              required
            >
              <option value="">Select type…</option>
              {questionTypes.map((qt) => (
                <option key={qt.id} value={qt.id}>{qt.code} — {qt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Difficulty *</label>
            <select
              className="input"
              value={form.difficulty}
              onChange={(e) => set('difficulty', e.target.value as 'easy' | 'medium' | 'hard')}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="label">Question Count *</label>
            <input
              type="number"
              className="input"
              value={form.questionCount}
              onChange={(e) => set('questionCount', Number(e.target.value))}
              min={1}
              max={200}
              required
            />
          </div>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea
            className="input h-20 resize-none"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Internal notes about this batch…"
          />
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating…' : 'Create Batch'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
