'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Subject, Chapter } from '@/types'

interface Coverage {
  chapter: { id: string; name: string; chapterNo: number; subject: string; class: string; board: string }
  total: number
  approved: number
  batchesCount: number
  byDifficulty: Record<string, number>
  byBloom: Record<string, number>
  byStatus: Record<string, number>
  byType: Record<string, number>
  byConcept: Array<{ uuid: string; name: string; count: number }>
  unmappedCount: number
}

const TARGET = 1000

export default function CoveragePage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [subjectId, setSubjectId] = useState('')
  const [chapterId, setChapterId] = useState('')
  const [data, setData] = useState<Coverage | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { api.get<Subject[]>('/master/subjects').then(setSubjects).catch(console.error) }, [])

  useEffect(() => {
    setChapterId(''); setData(null)
    if (!subjectId) { setChapters([]); return }
    api.get<Chapter[]>(`/master/chapters?subjectId=${subjectId}`).then(setChapters).catch(console.error)
  }, [subjectId])

  useEffect(() => {
    if (!chapterId) { setData(null); return }
    setLoading(true)
    api.get<Coverage>(`/coverage/chapter/${chapterId}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [chapterId])

  const pct = data ? Math.min(100, Math.round((data.total / TARGET) * 100)) : 0

  return (
    <div className="p-8 space-y-6">
      <div className="page-header">
        <div>
          <h1>Coverage</h1>
          <p className="text-sm text-gray-500 mt-1">Unique questions per chapter across all batches. Target {TARGET.toLocaleString()}+.</p>
        </div>
      </div>

      <div className="flex gap-4">
        <div>
          <label className="label">Subject</label>
          <select className="input !w-64" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">Select subject…</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
          </select>
        </div>
        <div>
          <label className="label">Chapter</label>
          <select className="input !w-72" value={chapterId} onChange={(e) => setChapterId(e.target.value)} disabled={!subjectId || chapters.length === 0}>
            <option value="">Select chapter…</option>
            {chapters.map((c) => <option key={c.id} value={c.id}>Ch {c.chapterNo}: {c.name}</option>)}
          </select>
        </div>
      </div>

      {loading && <div className="text-gray-400 text-sm">Loading…</div>}

      {data && (
        <div className="space-y-6">
          {/* Progress toward target */}
          <div className="card p-6">
            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-sm text-gray-500">{data.chapter.board} · {data.chapter.class} · {data.chapter.subject}</p>
                <h2 className="text-lg font-semibold">Ch {data.chapter.chapterNo}: {data.chapter.name}</h2>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-brand">{data.total.toLocaleString()}</p>
                <p className="text-xs text-gray-400">of {TARGET.toLocaleString()} target · {data.approved} approved</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className={`h-3 rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : 'bg-brand'}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-2">{data.batchesCount} batch(es) contributed to this chapter · {pct}% of target</p>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <Breakdown title="By Difficulty" data={data.byDifficulty} order={['easy', 'medium', 'hard']} />
            <Breakdown title="By Bloom Level" data={data.byBloom} order={['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']} />
            <Breakdown title="By Type" data={data.byType} />
          </div>

          {/* Concept coverage — surfaces gaps */}
          <div className="card p-5">
            <p className="section-title">By Concept ({data.byConcept.length})</p>
            <div className="space-y-2">
              {data.byConcept
                .slice()
                .sort((a, b) => a.count - b.count)
                .map((c) => {
                  const max = Math.max(1, ...data.byConcept.map((x) => x.count))
                  const w = Math.round((c.count / max) * 100)
                  return (
                    <div key={c.uuid} className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 w-64 truncate" title={c.name}>{c.name}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-4 relative">
                        <div className={`h-4 rounded-full ${c.count === 0 ? 'bg-red-200' : 'bg-brand/70'}`} style={{ width: `${Math.max(w, c.count === 0 ? 0 : 4)}%` }} />
                      </div>
                      <span className={`text-sm font-medium w-12 text-right ${c.count === 0 ? 'text-red-500' : 'text-gray-700'}`}>{c.count}</span>
                    </div>
                  )
                })}
              {data.unmappedCount > 0 && (
                <div className="flex items-center gap-3 pt-1 border-t border-gray-100 mt-2">
                  <span className="text-sm text-gray-400 w-64 italic">Not mapped to a concept</span>
                  <div className="flex-1" />
                  <span className="text-sm text-gray-400 w-12 text-right">{data.unmappedCount}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && !data && chapterId === '' && (
        <div className="card p-8 text-center text-gray-400 text-sm">Pick a subject and chapter to see its coverage.</div>
      )}
    </div>
  )
}

function Breakdown({ title, data, order }: { title: string; data: Record<string, number>; order?: string[] }) {
  const keys = order ? order.filter((k) => k in data || true) : Object.keys(data)
  const total = Object.values(data).reduce((a, b) => a + b, 0)
  return (
    <div className="card p-5">
      <p className="section-title">{title}</p>
      <div className="space-y-2">
        {keys.map((k) => {
          const v = data[k] ?? 0
          const w = total > 0 ? Math.round((v / total) * 100) : 0
          return (
            <div key={k} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-24 capitalize truncate">{k}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-3">
                <div className="h-3 rounded-full bg-brand/60" style={{ width: `${w}%` }} />
              </div>
              <span className="text-xs text-gray-600 w-8 text-right">{v}</span>
            </div>
          )
        })}
        {keys.length === 0 && <p className="text-xs text-gray-400">No data.</p>}
      </div>
    </div>
  )
}
