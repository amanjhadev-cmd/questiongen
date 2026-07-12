'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Subject, SubjectProfile, PromptVersion } from '@/types'
import { statusColor } from '@/lib/utils'

interface SubjectProfileDetail extends SubjectProfile {
  subject: Subject
  promptVersion: PromptVersion & { prompt: { name: string } }
}

interface FieldEntry {
  id: string
  fieldName: string
  label: string
  mode: 'required' | 'optional' | 'disabled' | 'auto'
  dataType: string
  isActive: boolean
  sortOrder: number
}

type Tab = 'profiles' | 'fields'

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profiles')
  const [profiles, setProfiles] = useState<SubjectProfileDetail[]>([])
  const [fields, setFields] = useState<FieldEntry[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)

  // Profile form
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [profileForm, setProfileForm] = useState({
    subjectId: '',
    promptVersionId: '',
    schemaVersionId: '',
    diagramEnabled: false,
    passageEnabled: false,
    conceptEnabled: false,
    solutionStepsEnabled: false,
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')

  // Field form
  const [showFieldForm, setShowFieldForm] = useState(false)
  const [fieldForm, setFieldForm] = useState({ fieldName: '', label: '', mode: 'optional', dataType: 'string', sortOrder: 0 })
  const [savingField, setSavingField] = useState(false)
  const [fieldError, setFieldError] = useState('')

  async function loadProfiles() {
    const data = await api.get<SubjectProfileDetail[]>('/subject-profiles')
    setProfiles(data)
  }
  async function loadFields() {
    const data = await api.get<FieldEntry[]>('/field-registry')
    setFields(data)
  }
  async function loadSubjects() {
    const data = await api.get<Subject[]>('/master/subjects')
    setSubjects(data)
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([loadProfiles(), loadFields(), loadSubjects()]).finally(() => setLoading(false))
  }, [])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileError('')
    setSavingProfile(true)
    try {
      await api.post('/subject-profiles', profileForm)
      await loadProfiles()
      setShowProfileForm(false)
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Failed')
    }
    setSavingProfile(false)
  }

  async function saveField(e: React.FormEvent) {
    e.preventDefault()
    setFieldError('')
    setSavingField(true)
    try {
      await api.post('/field-registry', fieldForm)
      await loadFields()
      setShowFieldForm(false)
      setFieldForm({ fieldName: '', label: '', mode: 'optional', dataType: 'string', sortOrder: 0 })
    } catch (err: unknown) {
      setFieldError(err instanceof Error ? err.message : 'Failed')
    }
    setSavingField(false)
  }

  async function updateFieldMode(id: string, mode: string) {
    try {
      await api.patch(`/field-registry/${id}`, { mode })
      await loadFields()
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
  }

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading…</div>

  const MODES = ['required', 'optional', 'disabled', 'auto']

  return (
    <div className="p-8 space-y-6">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {(['profiles', 'fields'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'profiles' ? 'Subject Profiles' : 'Field Registry'}
          </button>
        ))}
      </div>

      {tab === 'profiles' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowProfileForm(true)} className="btn-primary">+ Add Profile</button>
          </div>

          {showProfileForm && (
            <form onSubmit={saveProfile} className="card p-5 space-y-4 border-2 border-brand">
              <h2 className="text-base font-semibold">New Subject Profile</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Subject *</label>
                  <select className="input" value={profileForm.subjectId} onChange={(e) => setProfileForm((p) => ({ ...p, subjectId: e.target.value }))} required>
                    <option value="">Select subject…</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Prompt Version ID *</label>
                  <input className="input font-mono text-xs" value={profileForm.promptVersionId} onChange={(e) => setProfileForm((p) => ({ ...p, promptVersionId: e.target.value }))} placeholder="UUID of a published prompt version" required />
                </div>
                <div>
                  <label className="label">Schema Version ID</label>
                  <input className="input font-mono text-xs" value={profileForm.schemaVersionId} onChange={(e) => setProfileForm((p) => ({ ...p, schemaVersionId: e.target.value }))} placeholder="Optional — uses latest if omitted" />
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                {[
                  { key: 'diagramEnabled', label: 'Diagrams' },
                  { key: 'passageEnabled', label: 'Passage' },
                  { key: 'conceptEnabled', label: 'Concept Mapping' },
                  { key: 'solutionStepsEnabled', label: 'Solution Steps' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(profileForm as unknown as Record<string, boolean>)[key] ?? false}
                      onChange={(e) => setProfileForm((p) => ({ ...p, [key]: e.target.checked }))}
                    />
                    {label}
                  </label>
                ))}
              </div>
              {profileError && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{profileError}</p>}
              <div className="flex gap-2">
                <button type="submit" className="btn-primary" disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save Profile'}</button>
                <button type="button" className="btn-secondary" onClick={() => setShowProfileForm(false)}>Cancel</button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {profiles.map((p) => (
              <div key={p.id} className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold">{p.subject.name}</h2>
                  <span className="text-xs text-gray-400">Prompt: {p.promptVersion.prompt.name} v{p.promptVersion.versionNo}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'diagramEnabled', label: 'Diagrams' },
                    { key: 'passageEnabled', label: 'Passage' },
                    { key: 'conceptEnabled', label: 'Concept Mapping' },
                    { key: 'solutionStepsEnabled', label: 'Solution Steps' },
                  ].map(({ key, label }) => (
                    <span
                      key={key}
                      className={`badge ${(p as unknown as Record<string, boolean>)[key] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}
                    >
                      {label}: {(p as unknown as Record<string, boolean>)[key] ? 'on' : 'off'}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {profiles.length === 0 && (
              <div className="card p-8 text-center text-gray-400 text-sm">No subject profiles configured yet.</div>
            )}
          </div>
        </div>
      )}

      {tab === 'fields' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowFieldForm(true)} className="btn-primary">+ Add Field</button>
          </div>

          {showFieldForm && (
            <form onSubmit={saveField} className="card p-5 space-y-4 border-2 border-brand">
              <h2 className="text-base font-semibold">New Field Registry Entry</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Field Name *</label>
                  <input className="input font-mono text-xs" value={fieldForm.fieldName} onChange={(e) => setFieldForm((p) => ({ ...p, fieldName: e.target.value }))} placeholder="e.g. is_ncert" required />
                </div>
                <div>
                  <label className="label">Label *</label>
                  <input className="input" value={fieldForm.label} onChange={(e) => setFieldForm((p) => ({ ...p, label: e.target.value }))} placeholder="Human-readable label" required />
                </div>
                <div>
                  <label className="label">Mode *</label>
                  <select className="input" value={fieldForm.mode} onChange={(e) => setFieldForm((p) => ({ ...p, mode: e.target.value }))}>
                    {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Data Type *</label>
                  <select className="input" value={fieldForm.dataType} onChange={(e) => setFieldForm((p) => ({ ...p, dataType: e.target.value }))}>
                    {['string', 'number', 'boolean', 'array', 'object'].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              {fieldError && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{fieldError}</p>}
              <div className="flex gap-2">
                <button type="submit" className="btn-primary" disabled={savingField}>{savingField ? 'Saving…' : 'Save'}</button>
                <button type="button" className="btn-secondary" onClick={() => setShowFieldForm(false)}>Cancel</button>
              </div>
            </form>
          )}

          <div className="card divide-y divide-gray-50">
            {fields.map((f) => (
              <div key={f.id} className="px-5 py-3 flex items-center gap-4">
                <code className="text-xs font-mono text-brand bg-brand-muted px-2 py-0.5 rounded flex-shrink-0">{f.fieldName}</code>
                <p className="text-sm text-gray-600 flex-1">{f.label || '—'}</p>
                <select
                  className="input !w-36 text-xs py-1"
                  value={f.mode}
                  onChange={(e) => updateFieldMode(f.id, e.target.value)}
                >
                  {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            ))}
            {fields.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">No field registry entries.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
