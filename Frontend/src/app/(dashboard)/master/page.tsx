'use client'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import type { Subject, Chapter, Concept, Board, Class, QuestionType } from '@/types'
import { Plus, Pencil, Trash2, Upload } from 'lucide-react'

interface ImportSummary {
  totalRows: number
  boards: number
  classes: number
  subjects: number
  chapters: number
  conceptsCreated: number
  conceptsSkipped: number
  errors: Array<{ row: number; message: string }>
}

type Tab = 'boards' | 'classes' | 'subjects' | 'chapters' | 'concepts' | 'question-types'

const TABS: { key: Tab; label: string }[] = [
  { key: 'boards', label: 'Boards' },
  { key: 'classes', label: 'Classes' },
  { key: 'subjects', label: 'Subjects' },
  { key: 'chapters', label: 'Chapters' },
  { key: 'concepts', label: 'Concepts' },
  { key: 'question-types', label: 'Question Types' },
]

export default function MasterDataPage() {
  const [tab, setTab] = useState<Tab>('boards')
  const [boards, setBoards] = useState<Board[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [formClasses, setFormClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [concepts, setConcepts] = useState<Concept[]>([])
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedChapter, setSelectedChapter] = useState('')
  const [loading, setLoading] = useState(false)

  // Form state (shared between create + edit)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Excel import
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportSummary | null>(null)
  const [importError, setImportError] = useState('')

  async function loadBoards() { setBoards(await api.get<Board[]>('/master/boards')) }
  async function loadClasses() { setClasses(await api.get<Class[]>('/master/classes')) }
  async function loadFormClasses(boardId: string) {
    setFormClasses(boardId ? await api.get<Class[]>(`/master/classes?boardId=${boardId}`) : [])
  }
  async function loadSubjects() { setSubjects(await api.get<Subject[]>('/master/subjects')) }
  async function loadChapters(subjectId: string) { setChapters(await api.get<Chapter[]>(`/master/chapters?subjectId=${subjectId}`)) }
  async function loadConcepts(chapterId: string) { setConcepts(await api.get<Concept[]>(`/master/concepts?chapterId=${chapterId}`)) }
  async function loadQuestionTypes() { setQuestionTypes(await api.get<QuestionType[]>('/master/question-types')) }

  function resetForm() {
    setShowForm(false)
    setEditingId(null)
    setFormData({})
    setError('')
  }

  useEffect(() => {
    setLoading(true)
    resetForm()
    const tasks: Promise<void>[] = []
    if (tab === 'boards') tasks.push(loadBoards())
    if (tab === 'classes') { tasks.push(loadClasses()); tasks.push(loadBoards()) }
    if (tab === 'subjects') { tasks.push(loadSubjects()); tasks.push(loadBoards()) }
    if (tab === 'chapters') tasks.push(loadSubjects())
    if (tab === 'concepts') tasks.push(loadSubjects())
    if (tab === 'question-types') tasks.push(loadQuestionTypes())
    Promise.all(tasks).finally(() => setLoading(false))
  }, [tab])

  // Cascade: load classes for the subject-create form when a board is chosen
  useEffect(() => {
    if (formData.boardId) loadFormClasses(formData.boardId)
    else setFormClasses([])
  }, [formData.boardId])

  useEffect(() => {
    if (tab === 'chapters' && selectedSubject) loadChapters(selectedSubject)
    else if (tab === 'chapters') setChapters([])
  }, [selectedSubject, tab])

  useEffect(() => {
    if (tab === 'concepts' && selectedChapter) loadConcepts(selectedChapter)
    else if (tab === 'concepts') setConcepts([])
  }, [selectedChapter, tab])

  function openCreate() {
    setEditingId(null)
    setFormData({})
    setError('')
    setShowForm(true)
  }

  function openEdit(row: Record<string, unknown>) {
    setEditingId(row.id as string)
    const fd: Record<string, string> = {}
    for (const k of ['name', 'code', 'chapterNo', 'uuid', 'shortNote', 'label']) {
      if (row[k] !== undefined && row[k] !== null) fd[k] = String(row[k])
    }
    setFormData(fd)
    setError('')
    setShowForm(true)
  }

  async function reloadCurrent() {
    if (tab === 'boards') await loadBoards()
    else if (tab === 'classes') await loadClasses()
    else if (tab === 'subjects') await loadSubjects()
    else if (tab === 'chapters' && selectedSubject) await loadChapters(selectedSubject)
    else if (tab === 'concepts' && selectedChapter) await loadConcepts(selectedChapter)
    else if (tab === 'question-types') await loadQuestionTypes()
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      if (tab === 'boards') {
        if (editingId) await api.patch(`/master/boards/${editingId}`, { name: formData.name })
        else await api.post('/master/boards', { name: formData.name })
      } else if (tab === 'classes') {
        if (editingId) await api.patch(`/master/classes/${editingId}`, { name: formData.name })
        else await api.post('/master/classes', { boardId: formData.boardId, name: formData.name })
      } else if (tab === 'subjects') {
        if (editingId) await api.patch(`/master/subjects/${editingId}`, { name: formData.name, code: formData.code })
        else await api.post('/master/subjects', { name: formData.name, code: formData.code, classId: formData.classId })
      } else if (tab === 'chapters') {
        const chapterNo = Number(formData.chapterNo)
        if (editingId) await api.patch(`/master/chapters/${editingId}`, { name: formData.name, chapterNo })
        else await api.post('/master/chapters', { name: formData.name, chapterNo, subjectId: selectedSubject })
      } else if (tab === 'concepts') {
        if (editingId) await api.patch(`/master/concepts/${editingId}`, { name: formData.name, shortNote: formData.shortNote || undefined })
        else await api.post('/master/concepts', { name: formData.name, uuid: formData.uuid, shortNote: formData.shortNote || undefined, chapterId: selectedChapter })
      } else if (tab === 'question-types') {
        if (editingId) await api.patch(`/master/question-types/${editingId}`, { label: formData.label })
        else await api.post('/master/question-types', { code: formData.code, label: formData.label })
      }
      resetForm()
      await reloadCurrent()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
    setSaving(false)
  }

  async function handleDelete(kind: string, id: string, label: string) {
    if (!confirm(`Delete ${kind} "${label}"? This cannot be undone.`)) return
    try {
      await api.delete(`/master/${kind}/${id}`)
      await reloadCurrent()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  async function handleImportFile(file: File) {
    setImporting(true)
    setImportError('')
    setImportResult(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const summary = await api.upload<ImportSummary>('/master/import-excel', form)
      setImportResult(summary)
      // Refresh whatever tab is showing
      await Promise.all([loadBoards(), loadClasses(), loadSubjects(), reloadCurrent()])
    } catch (e: unknown) {
      setImportError(e instanceof Error ? e.message : 'Import failed')
    }
    setImporting(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const singular = tab === 'question-types' ? 'question type' : tab.slice(0, -1)

  return (
    <div className="p-8 space-y-6">
      <div className="page-header">
        <h1>Master Data</h1>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f) }}
          />
          <button onClick={() => fileRef.current?.click()} disabled={importing} className="btn-secondary" title="Import Board → Class → Subject → Chapter → Concept from an .xlsx file">
            <Upload size={15} /> {importing ? 'Importing…' : 'Import Excel'}
          </button>
          <button onClick={openCreate} className="btn-primary"><Plus size={15} /> Add {singular}</button>
        </div>
      </div>

      {/* Import result */}
      {importError && (
        <div className="card p-4 border border-red-200 bg-red-50 text-sm text-red-700">{importError}</div>
      )}
      {importResult && (
        <div className="card p-4 border-2 border-green-200 bg-green-50/40 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-green-800">Import complete — {importResult.totalRows} rows processed</p>
            <button onClick={() => setImportResult(null)} className="text-xs text-gray-400 hover:text-gray-600">Dismiss</button>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="badge bg-white border border-gray-200">Boards +{importResult.boards}</span>
            <span className="badge bg-white border border-gray-200">Classes +{importResult.classes}</span>
            <span className="badge bg-white border border-gray-200">Subjects +{importResult.subjects}</span>
            <span className="badge bg-white border border-gray-200">Chapters +{importResult.chapters}</span>
            <span className="badge bg-green-100 text-green-700">Concepts created {importResult.conceptsCreated}</span>
            {importResult.conceptsSkipped > 0 && <span className="badge bg-gray-100 text-gray-500">Skipped {importResult.conceptsSkipped}</span>}
            {importResult.errors.length > 0 && <span className="badge bg-orange-100 text-orange-700">{importResult.errors.length} row error(s)</span>}
          </div>
          {importResult.errors.length > 0 && (
            <div className="max-h-32 overflow-y-auto text-xs text-orange-700 space-y-0.5 mt-1">
              {importResult.errors.slice(0, 20).map((er, i) => <p key={i}>Row {er.row}: {er.message}</p>)}
              {importResult.errors.length > 20 && <p className="text-gray-400">+{importResult.errors.length - 20} more…</p>}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 flex-wrap">
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
            <select className="input !w-64" value={selectedSubject} onChange={(e) => { setSelectedSubject(e.target.value); setSelectedChapter('') }}>
              <option value="">Select subject…</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {tab === 'concepts' && (
            <div>
              <label className="label">Chapter</label>
              <select className="input !w-64" value={selectedChapter} onChange={(e) => setSelectedChapter(e.target.value)} disabled={!selectedSubject || chapters.length === 0}>
                <option value="">Select chapter…</option>
                {chapters.map((c) => <option key={c.id} value={c.id}>Ch {c.chapterNo}: {c.name}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <div className="card p-5 space-y-4 border-2 border-brand">
          <h2 className="text-base font-semibold">{editingId ? 'Edit' : 'Add'} {singular}</h2>

          {tab === 'boards' && (
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Name *</label><input className="input" value={formData.name ?? ''} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="CBSE" /></div>
            </div>
          )}

          {tab === 'classes' && (
            <div className="grid grid-cols-2 gap-4">
              {!editingId && (
                <div>
                  <label className="label">Board *</label>
                  <select className="input" value={formData.boardId ?? ''} onChange={(e) => setFormData((p) => ({ ...p, boardId: e.target.value }))}>
                    <option value="">Select board…</option>
                    {boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}
              <div><label className="label">Name *</label><input className="input" value={formData.name ?? ''} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="Class 10" /></div>
            </div>
          )}

          {tab === 'subjects' && (
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Name *</label><input className="input" value={formData.name ?? ''} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="Science" /></div>
              <div><label className="label">Code *</label><input className="input" value={formData.code ?? ''} onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))} placeholder="SCI10" /></div>
              {!editingId && (
                <>
                  <div>
                    <label className="label">Board *</label>
                    <select className="input" value={formData.boardId ?? ''} onChange={(e) => setFormData((p) => ({ ...p, boardId: e.target.value, classId: '' }))}>
                      <option value="">Select board…</option>
                      {boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Class *</label>
                    <select className="input" value={formData.classId ?? ''} onChange={(e) => setFormData((p) => ({ ...p, classId: e.target.value }))} disabled={!formData.boardId || formClasses.length === 0}>
                      <option value="">Select class…</option>
                      {formClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </>
              )}
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
              <div><label className="label">UUID *</label><input className="input font-mono text-xs disabled:bg-gray-50 disabled:text-gray-400" value={formData.uuid ?? ''} disabled={!!editingId} onChange={(e) => setFormData((p) => ({ ...p, uuid: e.target.value }))} placeholder="SCI-0001-A1B2" /></div>
              <div className="col-span-2"><label className="label">Short Note</label><input className="input" value={formData.shortNote ?? ''} onChange={(e) => setFormData((p) => ({ ...p, shortNote: e.target.value }))} /></div>
            </div>
          )}

          {tab === 'question-types' && (
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Code *</label><input className="input font-mono uppercase disabled:bg-gray-50 disabled:text-gray-400" value={formData.code ?? ''} disabled={!!editingId} onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))} placeholder="MCQ" /></div>
              <div><label className="label">Label *</label><input className="input" value={formData.label ?? ''} onChange={(e) => setFormData((p) => ({ ...p, label: e.target.value }))} placeholder="Multiple Choice Question" /></div>
            </div>
          )}

          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Save'}</button>
            <button onClick={resetForm} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {loading && <div className="text-gray-400 text-sm">Loading…</div>}

      {/* Boards */}
      {!loading && tab === 'boards' && (
        <div className="card divide-y divide-gray-50">
          {boards.map((b) => (
            <Row key={b.id} onEdit={() => openEdit(b as unknown as Record<string, unknown>)} onDelete={() => handleDelete('boards', b.id, b.name)}>
              <span className="text-sm text-gray-800">{b.name}</span>
            </Row>
          ))}
          {boards.length === 0 && <Empty>No boards yet.</Empty>}
        </div>
      )}

      {/* Classes */}
      {!loading && tab === 'classes' && (
        <div className="card divide-y divide-gray-50">
          {classes.map((c) => (
            <Row key={c.id} onEdit={() => openEdit(c as unknown as Record<string, unknown>)} onDelete={() => handleDelete('classes', c.id, c.name)}>
              <span className="text-sm text-gray-800">{c.name}</span>
              <span className="text-xs text-gray-400">{c.board?.name}</span>
            </Row>
          ))}
          {classes.length === 0 && <Empty>No classes yet. Add a board first, then a class under it.</Empty>}
        </div>
      )}

      {/* Subjects */}
      {!loading && tab === 'subjects' && (
        <div className="card divide-y divide-gray-50">
          {subjects.map((s) => (
            <Row key={s.id} onEdit={() => openEdit(s as unknown as Record<string, unknown>)} onDelete={() => handleDelete('subjects', s.id, s.name)}>
              <span className="text-sm text-gray-800">{s.name}</span>
              <code className="text-xs text-brand bg-brand-muted px-2 py-0.5 rounded">{s.code}</code>
            </Row>
          ))}
          {subjects.length === 0 && <Empty>No subjects yet.</Empty>}
        </div>
      )}

      {/* Chapters */}
      {!loading && tab === 'chapters' && selectedSubject && (
        <div className="card divide-y divide-gray-50">
          {chapters.map((c) => (
            <Row key={c.id} onEdit={() => openEdit(c as unknown as Record<string, unknown>)} onDelete={() => handleDelete('chapters', c.id, c.name)}>
              <span className="text-xs font-mono text-brand bg-brand-muted px-2 py-0.5 rounded w-10 text-center">{c.chapterNo}</span>
              <span className="text-sm text-gray-800">{c.name}</span>
            </Row>
          ))}
          {chapters.length === 0 && <Empty>No chapters for this subject.</Empty>}
        </div>
      )}
      {!loading && tab === 'chapters' && !selectedSubject && <Empty>Select a subject to view its chapters.</Empty>}

      {/* Concepts */}
      {!loading && tab === 'concepts' && selectedChapter && (
        <div className="card divide-y divide-gray-50">
          {concepts.map((c) => (
            <Row key={c.id} onEdit={() => openEdit(c as unknown as Record<string, unknown>)} onDelete={() => handleDelete('concepts', c.id, c.name)}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-brand bg-brand-muted px-2 py-0.5 rounded">{c.uuid}</code>
                  <span className="text-sm text-gray-800">{c.name}</span>
                </div>
                {c.shortNote && <p className="text-xs text-gray-400 mt-1 ml-1">{c.shortNote}</p>}
              </div>
            </Row>
          ))}
          {concepts.length === 0 && <Empty>No concepts for this chapter.</Empty>}
        </div>
      )}
      {!loading && tab === 'concepts' && !selectedChapter && <Empty>Select a subject and chapter to view concepts.</Empty>}

      {/* Question Types */}
      {!loading && tab === 'question-types' && (
        <div className="card divide-y divide-gray-50">
          {questionTypes.map((qt) => (
            <Row key={qt.id} onEdit={() => openEdit(qt as unknown as Record<string, unknown>)} onDelete={() => handleDelete('question-types', qt.id, qt.code)}>
              <code className="text-xs text-brand bg-brand-muted px-2 py-0.5 rounded">{qt.code}</code>
              <span className="text-sm text-gray-800">{qt.label}</span>
            </Row>
          ))}
          {questionTypes.length === 0 && <Empty>No question types yet.</Empty>}
        </div>
      )}
    </div>
  )
}

function Row({ children, onEdit, onDelete }: { children: React.ReactNode; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="px-5 py-3 flex items-center gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">{children}</div>
      <button onClick={onEdit} className="text-gray-400 hover:text-brand p-1" title="Edit"><Pencil size={15} /></button>
      <button onClick={onDelete} className="text-gray-400 hover:text-red-500 p-1" title="Delete"><Trash2 size={15} /></button>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="card px-5 py-4 text-sm text-gray-400">{children}</p>
}
