'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Subject, Chapter, Concept, Board, Class, QuestionType } from '@/types'
import { Plus, ChevronDown, ChevronRight } from 'lucide-react'

type Tab = 'boards' | 'subjects' | 'chapters' | 'concepts' | 'question-types'

export default function MasterDataPage() {
  const [tab, setTab] = useState<Tab>('subjects')
  const [boards, setBoards] = useState<Board[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [concepts, setConcepts] = useState<Concept[]>([])
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedChapter, setSelectedChapter] = useState('')
  const [loading, setLoading] = useState(false)

  // Create form state
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadBoards() {
    const data = await api.get<Board[]>('/master/boards')
    setBoards(data)
  }
  async function loadClasses(boardId: string) {
    const data = await api.get<Class[]>(`/master/classes?boardId=${boardId}`)
    setClasses(data)
  }
  async function loadSubjects() {
    const data = await api.get<Subject[]>('/master/subjects')
    setSubjects(data)
  }
  async function loadChapters(subjectId: string) {
    const data = await api.get<Chapter[]>(`/master/chapters?subjectId=${subjectId}`)
    setChapters(data)
  }
  async function loadConcepts(chapterId: string) {
    const data = await api.get<Concept[]>(`/master/concepts?chapterId=${chapterId}`)
    setConcepts(data)
  }
  async function loadQuestionTypes() {
    const data = await api.get<QuestionType[]>('/master/question-types')
    setQuestionTypes(data)
  }

  useEffect(() => {
    setLoading(true)
    setShowForm(false)
    setFormData({})
    setError('')
    const tasks: Promise<void>[] = []
    if (tab === 'boards') tasks.push(loadBoards())
    if (tab === 'subjects') { tasks.push(loadSubjects()); tasks.push(loadBoards()) }
    if (tab === 'chapters') tasks.push(loadSubjects())
    if (tab === 'concepts') { tasks.push(loadSubjects()) }
    if (tab === 'question-types') tasks.push(loadQuestionTypes())
    Promise.all(tasks).finally(() => setLoading(false))
  }, [tab])

  // Cascade: load classes when a board is chosen in the subject-create form
  useEffect(() => {
    if (formData.boardId) loadClasses(formData.boardId)
    else setClasses([])
  }, [formData.boardId])

  useEffect(() => {
    if (tab === 'chapters' && selectedSubject) loadChapters(selectedSubject)
    else setChapters([])
  }, [selectedSubject, tab])

  useEffect(() => {
    if (tab === 'concepts' && selectedChapter) loadConcepts(selectedChapter)
    else setConcepts([])
  }, [selectedChapter, tab])

  async function handleCreate() {
    setSaving(true)
    setError('')
    try {
      if (tab === 'boards') {
        await api.post('/master/boards', { name: formData.name })
        await loadBoards()
      } else if (tab === 'subjects') {
        await api.post('/master/subjects', {
          name: formData.name,
          code: formData.code,
          classId: formData.classId,
        })
        await loadSubjects()
      } else if (tab === 'chapters') {
        await api.post('/master/chapters', {
          name: formData.name,
          chapterNo: Number(formData.chapterNo),
          subjectId: selectedSubject,
        })
        await loadChapters(selectedSubject)
      } else if (tab === 'concepts') {
        await api.post('/master/concepts', {
          name: formData.name,
          uuid: formData.uuid,
          shortNote: formData.shortNote || undefined,
          chapterId: selectedChapter,
        })
        await loadConcepts(selectedChapter)
      }
      setShowForm(false)
      setFormData({})
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
    setSaving(false)
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'boards', label: 'Boards' },
    { key: 'subjects', label: 'Subjects' },
    { key: 'chapters', label: 'Chapters' },
    { key: 'concepts', label: 'Concepts' },
    { key: 'question-types', label: 'Question Types' },
  ]

  return (
    <div className="p-8 space-y-6">
      <div className="page-header">
        <h1>Master Data</h1>
        {tab !== 'question-types' && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={15} /> Add {tab.slice(0, -1).replace('-', ' ')}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Context selectors */}
      {(tab === 'chapters' || tab === 'concepts') && (
        <div className="flex gap-4">
          <div>
            <label className="label">Subject</label>
            <select
              className="input !w-64"
              value={selectedSubject}
              onChange={(e) => { setSelectedSubject(e.target.value); setSelectedChapter('') }}
            >
              <option value="">Select subject…</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {tab === 'concepts' && (
            <div>
              <label className="label">Chapter</label>
              <select
                className="input !w-64"
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(e.target.value)}
                disabled={!selectedSubject || chapters.length === 0}
              >
                <option value="">Select chapter…</option>
                {chapters.map((c) => <option key={c.id} value={c.id}>Ch {c.chapterNo}: {c.name}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="card p-5 space-y-4 border-2 border-brand">
          <h2 className="text-base font-semibold">Add {tab.slice(0, -1).replace('-', ' ')}</h2>

          {tab === 'boards' && (
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Name *</label><input className="input" value={formData.name ?? ''} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="CBSE" /></div>
            </div>
          )}

          {tab === 'subjects' && (
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Name *</label><input className="input" value={formData.name ?? ''} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="Science" /></div>
              <div><label className="label">Code *</label><input className="input" value={formData.code ?? ''} onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))} placeholder="SCI10" /></div>
              <div>
                <label className="label">Board *</label>
                <select className="input" value={formData.boardId ?? ''} onChange={(e) => setFormData((p) => ({ ...p, boardId: e.target.value, classId: '' }))}>
                  <option value="">Select board…</option>
                  {boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Class *</label>
                <select className="input" value={formData.classId ?? ''} onChange={(e) => setFormData((p) => ({ ...p, classId: e.target.value }))} disabled={!formData.boardId || classes.length === 0}>
                  <option value="">Select class…</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          )}

          {tab === 'chapters' && (
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Name *</label><input className="input" value={formData.name ?? ''} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} /></div>
              <div><label className="label">Chapter No *</label><input type="number" className="input" value={formData.chapterNo ?? ''} onChange={(e) => setFormData((p) => ({ ...p, chapterNo: e.target.value }))} /></div>
            </div>
          )}

          {tab === 'concepts' && (
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Name *</label><input className="input" value={formData.name ?? ''} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} /></div>
              <div><label className="label">UUID *</label><input className="input font-mono text-xs" value={formData.uuid ?? ''} onChange={(e) => setFormData((p) => ({ ...p, uuid: e.target.value }))} placeholder="SCI-0001-A1B2" /></div>
              <div className="col-span-2"><label className="label">Short Note</label><input className="input" value={formData.shortNote ?? ''} onChange={(e) => setFormData((p) => ({ ...p, shortNote: e.target.value }))} /></div>
            </div>
          )}

          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
            <button onClick={() => { setShowForm(false); setFormData({}) }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Data display */}
      {loading && <div className="text-gray-400 text-sm">Loading…</div>}

      {!loading && tab === 'boards' && (
        <div className="card divide-y divide-gray-50">
          {boards.map((b) => (
            <div key={b.id} className="px-5 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-800">{b.name}</span>
              <code className="text-xs text-brand bg-brand-muted px-2 py-0.5 rounded">{b.name.slice(0, 6).toUpperCase()}</code>
            </div>
          ))}
          {boards.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">No boards yet.</p>}
        </div>
      )}

      {!loading && tab === 'subjects' && (
        <div className="card divide-y divide-gray-50">
          {subjects.map((s) => (
            <div key={s.id} className="px-5 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-800">{s.name}</span>
              <code className="text-xs text-brand bg-brand-muted px-2 py-0.5 rounded">{s.code}</code>
            </div>
          ))}
          {subjects.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">No subjects yet.</p>}
        </div>
      )}

      {!loading && tab === 'chapters' && selectedSubject && (
        <div className="card divide-y divide-gray-50">
          {chapters.map((c) => (
            <div key={c.id} className="px-5 py-3 flex items-center gap-3">
              <span className="text-xs font-mono text-brand bg-brand-muted px-2 py-0.5 rounded w-10 text-center">{c.chapterNo}</span>
              <span className="text-sm text-gray-800">{c.name}</span>
            </div>
          ))}
          {chapters.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">No chapters for this subject.</p>}
        </div>
      )}

      {!loading && tab === 'concepts' && selectedChapter && (
        <div className="card divide-y divide-gray-50">
          {concepts.map((c) => (
            <div key={c.id} className="px-5 py-3">
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-brand bg-brand-muted px-2 py-0.5 rounded">{c.uuid}</code>
                <span className="text-sm text-gray-800">{c.name}</span>
              </div>
              {c.shortNote && <p className="text-xs text-gray-400 mt-1 ml-1">{c.shortNote}</p>}
            </div>
          ))}
          {concepts.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">No concepts for this chapter.</p>}
        </div>
      )}

      {!loading && tab === 'question-types' && (
        <div className="card divide-y divide-gray-50">
          {questionTypes.map((qt) => (
            <div key={qt.id} className="px-5 py-3 flex items-center gap-3">
              <code className="text-xs text-brand bg-brand-muted px-2 py-0.5 rounded">{qt.code}</code>
              <span className="text-sm text-gray-800">{qt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
