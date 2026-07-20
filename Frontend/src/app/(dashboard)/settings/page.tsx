'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Subject, SubjectProfile, PromptVersion } from '@/types'
import { Pencil, Trash2 } from 'lucide-react'

interface SubjectProfileDetail extends SubjectProfile {
  subject: Subject
  promptVersion: PromptVersion & { prompt: { name: string } }
}

export default function SettingsPage() {
  const [profiles, setProfiles] = useState<SubjectProfileDetail[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [prompts, setPrompts] = useState<Array<{ id: string; name: string; versions: PromptVersion[] }>>([])
  const [schemas, setSchemas] = useState<Array<{ id: string; name: string; versions: Array<{ id: string; versionNo: number }> }>>([])
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

  async function loadProfiles() {
    const data = await api.get<SubjectProfileDetail[]>('/subject-profiles')
    setProfiles(data)
  }
  async function loadSubjects() {
    const data = await api.get<Subject[]>('/master/subjects')
    setSubjects(data)
  }
  async function loadPrompts() {
    // /prompts only returns the latest version per prompt, so fetch each prompt's full versions
    const list = await api.get<Array<{ id: string; name: string }>>('/prompts')
    const full = await Promise.all(
      list.map((p) => api.get<{ id: string; name: string; versions: PromptVersion[] }>(`/prompts/${p.id}`)),
    )
    setPrompts(full)
  }
  async function loadSchemas() {
    const data = await api.get<Array<{ id: string; name: string; versions: Array<{ id: string; versionNo: number }> }>>('/schemas')
    setSchemas(data)
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([loadProfiles(), loadSubjects(), loadPrompts(), loadSchemas()]).finally(() => setLoading(false))
  }, [])

  // Flattened dropdown options
  const publishedVersions = prompts.flatMap((p) =>
    p.versions
      .filter((v) => v.status === 'published')
      .map((v) => ({ id: v.id, label: `${p.name} v${v.versionNo}` })),
  )
  const schemaVersionOptions = schemas.flatMap((s) =>
    s.versions.map((v) => ({ id: v.id, label: `${s.name} v${v.versionNo}` })),
  )

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileError('')
    setSavingProfile(true)
    try {
      await api.put('/subject-profiles', profileForm)
      await loadProfiles()
      setShowProfileForm(false)
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Failed')
    }
    setSavingProfile(false)
  }

  function startEditProfile(p: SubjectProfileDetail) {
    setProfileForm({
      subjectId: p.subjectId,
      promptVersionId: p.promptVersionId,
      schemaVersionId: p.schemaVersionId,
      diagramEnabled: p.diagramEnabled,
      passageEnabled: p.passageEnabled,
      conceptEnabled: p.conceptEnabled,
      solutionStepsEnabled: p.solutionStepsEnabled,
    })
    setShowProfileForm(true)
  }

  async function deleteProfile(subjectId: string, subjectName: string) {
    if (!confirm(`Delete the subject profile for ${subjectName}? Batches can't be created for it until a new one is configured.`)) return
    try {
      await api.delete(`/subject-profiles/${subjectId}`)
      await loadProfiles()
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
  }

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading…</div>

  return (
    <div className="p-8 space-y-6">
      <div className="page-header">
        <div>
          <h1>Subject Profiles</h1>
          <p className="text-sm text-gray-500 mt-1">Per-subject config every batch inherits: prompt version, schema version, and which optional features (diagrams, passage, concept mapping, solution steps) are allowed.</p>
        </div>
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
              <label className="label">Prompt Version *</label>
              <select className="input" value={profileForm.promptVersionId} onChange={(e) => setProfileForm((p) => ({ ...p, promptVersionId: e.target.value }))} required>
                <option value="">Select published prompt version…</option>
                {publishedVersions.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
              {publishedVersions.length === 0 && <p className="text-xs text-orange-500 mt-1">No published prompt versions. Publish one in the Prompt Library first.</p>}
            </div>
            <div>
              <label className="label">Schema Version *</label>
              <select className="input" value={profileForm.schemaVersionId} onChange={(e) => setProfileForm((p) => ({ ...p, schemaVersionId: e.target.value }))} required>
                <option value="">Select schema version…</option>
                {schemaVersionOptions.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
              {schemaVersionOptions.length === 0 && <p className="text-xs text-orange-500 mt-1">No schema versions found. Seed the database first.</p>}
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
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold">{p.subject.name}</h2>
                <span className="text-xs text-gray-400">Prompt: {p.promptVersion.prompt.name} v{p.promptVersion.versionNo}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => startEditProfile(p)} className="text-gray-400 hover:text-brand p-1" title="Edit"><Pencil size={15} /></button>
                <button onClick={() => deleteProfile(p.subjectId, p.subject.name)} className="text-gray-400 hover:text-red-500 p-1" title="Delete"><Trash2 size={15} /></button>
              </div>
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
  )
}
