'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Subject, SubjectProfile, PromptVersion } from '@/types'
import { usePrefs, DEFAULTS, ACCENT_PRESETS } from '@/lib/theme'
import { Toggle, Segmented, Swatch, SettingRow, SettingCard, Toast } from '@/components/ui/controls'
import {
  Palette, LayoutGrid, SlidersHorizontal, Type, Wand2, Sun, Moon, Monitor,
  RotateCcw, Pencil, Trash2, Plus, Layers, Sparkles,
} from 'lucide-react'

type Section = 'appearance' | 'profiles' | 'advanced'

const NAV: { id: Section; label: string; icon: typeof Palette }[] = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'profiles', label: 'Subject Profiles', icon: Layers },
  { id: 'advanced', label: 'Advanced', icon: SlidersHorizontal },
]

export default function SettingsPage() {
  const [section, setSection] = useState<Section>('appearance')
  const [toast, setToast] = useState('')
  function flash(msg: string) {
    setToast(msg)
    window.clearTimeout((flash as unknown as { t?: number }).t)
    ;(flash as unknown as { t?: number }).t = window.setTimeout(() => setToast(''), 2000)
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 animate-fade-in-up">
        <h1 className="text-fg">Settings</h1>
        <p className="text-sm text-mut mt-1">Personalize your workspace and manage subject configuration.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Settings navigation */}
        <nav className="lg:w-56 flex-shrink-0">
          <div className="card p-2 lg:sticky lg:top-6 flex lg:flex-col gap-1 overflow-x-auto">
            {NAV.map((n) => {
              const active = section === n.id
              return (
                <button
                  key={n.id}
                  onClick={() => setSection(n.id)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition whitespace-nowrap ${active ? 'text-white' : 'text-mut hover:text-fg'}`}
                  style={{ background: active ? 'rgb(var(--accent))' : 'transparent', transitionDuration: 'var(--anim)' }}
                >
                  <n.icon size={18} />
                  {n.label}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-6" key={section}>
          {section === 'appearance' && <AppearanceSection flash={flash} />}
          {section === 'profiles' && <ProfilesSection flash={flash} />}
          {section === 'advanced' && <AdvancedSection flash={flash} />}
        </div>
      </div>

      <Toast show={!!toast} message={toast} />
    </div>
  )
}

// ── Appearance ─────────────────────────────────────────────────────────────────
function AppearanceSection({ flash }: { flash: (m: string) => void }) {
  const p = usePrefs()
  const set = (patch: Parameters<typeof p.set>[0], msg = 'Appearance updated') => { p.set(patch); flash(msg) }

  return (
    <>
      <SettingCard title="Theme & Accent" description="Set the overall look and your accent color." icon={<Palette size={18} />}>
        <SettingRow title="Theme" description="Light, dark, or follow your system.">
          <Segmented
            value={p.theme}
            onChange={(v) => set({ theme: v })}
            options={[
              { value: 'light', label: 'Light', icon: <Sun size={14} /> },
              { value: 'dark', label: 'Dark', icon: <Moon size={14} /> },
              { value: 'system', label: 'System', icon: <Monitor size={14} /> },
            ]}
          />
        </SettingRow>
        <div className="border-t border-token pt-4 mt-1">
          <p className="text-sm font-medium text-fg mb-3">Accent color</p>
          <div className="flex items-center gap-3 flex-wrap">
            {ACCENT_PRESETS.map((c) => (
              <Swatch key={c} color={c} active={p.accent.toLowerCase() === c.toLowerCase()} onClick={() => set({ accent: c })} />
            ))}
            <label className="relative h-8 w-8 rounded-full border border-token overflow-hidden cursor-pointer" title="Custom color">
              <span className="absolute inset-0 flex items-center justify-center text-mut text-xs">+</span>
              <input type="color" value={p.accent} onChange={(e) => set({ accent: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer" />
            </label>
          </div>
        </div>
      </SettingCard>

      <SettingCard title="Layout" description="Sidebar, corners, and spacing." icon={<LayoutGrid size={18} />}>
        <SettingRow title="Sidebar style" description="How the main navigation is presented.">
          <Segmented value={p.sidebar} onChange={(v) => set({ sidebar: v })}
            options={[{ value: 'default', label: 'Default' }, { value: 'floating', label: 'Floating' }, { value: 'compact', label: 'Compact' }]} />
        </SettingRow>
        <div className="border-t border-token" />
        <SettingRow title="Card radius" description="Corner rounding across the app.">
          <Segmented value={p.radius} onChange={(v) => set({ radius: v })}
            options={[{ value: 'sharp', label: 'Sharp' }, { value: 'rounded', label: 'Rounded' }, { value: 'pill', label: 'Pill' }]} />
        </SettingRow>
        <div className="border-t border-token" />
        <SettingRow title="UI density" description="Comfortable or compact spacing.">
          <Segmented value={p.density} onChange={(v) => set({ density: v })}
            options={[{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }]} />
        </SettingRow>
      </SettingCard>

      <SettingCard title="Typography & Motion" description="Text size and animation speed." icon={<Type size={18} />}>
        <SettingRow title="Font size" description="Base text size for the whole app.">
          <Segmented value={p.fontSize} onChange={(v) => set({ fontSize: v })}
            options={[{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }]} />
        </SettingRow>
        <div className="border-t border-token" />
        <SettingRow title="Animation speed" description="How fast transitions play.">
          <Segmented value={p.animation} onChange={(v) => set({ animation: v })}
            options={[{ value: 'slow', label: 'Slow' }, { value: 'normal', label: 'Normal' }, { value: 'fast', label: 'Fast' }]} />
        </SettingRow>
      </SettingCard>

      <SettingCard title="Effects" description="Surface treatment for cards." icon={<Wand2 size={18} />}>
        <SettingRow title="Glass effect" description="Translucent card surfaces.">
          <Toggle checked={p.glass} onChange={(v) => set({ glass: v })} />
        </SettingRow>
        <div className="border-t border-token" />
        <SettingRow title="Background blur" description="Blur behind cards (best with glass).">
          <Toggle checked={p.blur} onChange={(v) => set({ blur: v })} />
        </SettingRow>
        <div className="border-t border-token" />
        <SettingRow title="Shadows" description="Soft elevation under cards.">
          <Toggle checked={p.shadows} onChange={(v) => set({ shadows: v })} />
        </SettingRow>
      </SettingCard>

      {/* Live preview */}
      <SettingCard title="Preview" description="A live sample of your current theme." icon={<Sparkles size={18} />}>
        <div className="surface-2 border border-token rounded-2xl p-5 flex flex-wrap items-center gap-3">
          <button className="btn-primary">Primary</button>
          <button className="btn-secondary">Secondary</button>
          <span className="badge bg-brand-muted text-brand">Accent badge</span>
          <input className="input !w-40" placeholder="Sample input" />
        </div>
      </SettingCard>
    </>
  )
}

// ── Advanced ───────────────────────────────────────────────────────────────────
function AdvancedSection({ flash }: { flash: (m: string) => void }) {
  const reset = usePrefs((s) => s.reset)
  return (
    <SettingCard title="Reset" description="Restore appearance settings." icon={<RotateCcw size={18} />}>
      <SettingRow title="Reset appearance" description={`Back to defaults (${DEFAULTS.theme} theme, blue accent, rounded).`}>
        <button
          onClick={() => { reset(); flash('Appearance reset to defaults') }}
          className="btn-secondary"
        >
          <RotateCcw size={15} /> Reset
        </button>
      </SettingRow>
    </SettingCard>
  )
}

// ── Subject Profiles (existing functionality, restyled) ─────────────────────────
interface SubjectProfileDetail extends SubjectProfile {
  subject: Subject
  promptVersion: PromptVersion & { prompt: { name: string } }
}

const FEATURE_FLAGS = [
  { key: 'diagramEnabled', label: 'Diagrams' },
  { key: 'passageEnabled', label: 'Passage' },
  { key: 'conceptEnabled', label: 'Concept Mapping' },
  { key: 'solutionStepsEnabled', label: 'Solution Steps' },
] as const

function ProfilesSection({ flash }: { flash: (m: string) => void }) {
  const [profiles, setProfiles] = useState<SubjectProfileDetail[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [prompts, setPrompts] = useState<Array<{ id: string; name: string; versions: PromptVersion[] }>>([])
  const [schemas, setSchemas] = useState<Array<{ id: string; name: string; versions: Array<{ id: string; versionNo: number }> }>>([])
  const [loading, setLoading] = useState(true)

  const [showProfileForm, setShowProfileForm] = useState(false)
  const [profileForm, setProfileForm] = useState({
    subjectId: '', promptVersionId: '', schemaVersionId: '',
    diagramEnabled: false, passageEnabled: false, conceptEnabled: false, solutionStepsEnabled: false,
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')

  async function loadProfiles() { setProfiles(await api.get<SubjectProfileDetail[]>('/subject-profiles')) }
  async function loadSubjects() { setSubjects(await api.get<Subject[]>('/master/subjects')) }
  async function loadPrompts() {
    const list = await api.get<Array<{ id: string; name: string }>>('/prompts')
    const full = await Promise.all(list.map((p) => api.get<{ id: string; name: string; versions: PromptVersion[] }>(`/prompts/${p.id}`)))
    setPrompts(full)
  }
  async function loadSchemas() {
    setSchemas(await api.get<Array<{ id: string; name: string; versions: Array<{ id: string; versionNo: number }> }>>('/schemas'))
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([loadProfiles(), loadSubjects(), loadPrompts(), loadSchemas()]).finally(() => setLoading(false))
  }, [])

  const publishedVersions = prompts.flatMap((p) => p.versions.filter((v) => v.status === 'published').map((v) => ({ id: v.id, label: `${p.name} v${v.versionNo}` })))
  const schemaVersionOptions = schemas.flatMap((s) => s.versions.map((v) => ({ id: v.id, label: `${s.name} v${v.versionNo}` })))

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileError('')
    setSavingProfile(true)
    try {
      await api.put('/subject-profiles', profileForm)
      await loadProfiles()
      setShowProfileForm(false)
      flash('Subject profile saved')
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Failed')
    }
    setSavingProfile(false)
  }

  function startEditProfile(p: SubjectProfileDetail) {
    setProfileForm({
      subjectId: p.subjectId, promptVersionId: p.promptVersionId, schemaVersionId: p.schemaVersionId,
      diagramEnabled: p.diagramEnabled, passageEnabled: p.passageEnabled, conceptEnabled: p.conceptEnabled, solutionStepsEnabled: p.solutionStepsEnabled,
    })
    setShowProfileForm(true)
  }

  async function deleteProfile(subjectId: string, subjectName: string) {
    if (!confirm(`Delete the subject profile for ${subjectName}? Batches can't be created for it until a new one is configured.`)) return
    try {
      await api.delete(`/subject-profiles/${subjectId}`)
      await loadProfiles()
      flash('Subject profile deleted')
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
  }

  return (
    <>
      <div className="card p-6 flex items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <h2 className="text-base font-semibold text-fg">Subject Profiles</h2>
          <p className="text-sm text-mut mt-0.5">Per-subject config every batch inherits — prompt & schema version and which optional features are allowed.</p>
        </div>
        <button onClick={() => { setProfileForm({ subjectId: '', promptVersionId: '', schemaVersionId: '', diagramEnabled: false, passageEnabled: false, conceptEnabled: false, solutionStepsEnabled: false }); setShowProfileForm(true) }} className="btn-primary flex-shrink-0">
          <Plus size={15} /> Add Profile
        </button>
      </div>

      {showProfileForm && (
        <form onSubmit={saveProfile} className="card p-6 space-y-4 animate-fade-in-up" style={{ borderColor: 'rgb(var(--accent) / 0.4)' }}>
          <h3 className="text-base font-semibold text-fg">New Subject Profile</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Subject *</label>
              <select className="input" value={profileForm.subjectId} onChange={(e) => setProfileForm((f) => ({ ...f, subjectId: e.target.value }))} required>
                <option value="">Select subject…</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Prompt Version *</label>
              <select className="input" value={profileForm.promptVersionId} onChange={(e) => setProfileForm((f) => ({ ...f, promptVersionId: e.target.value }))} required>
                <option value="">Select published prompt version…</option>
                {publishedVersions.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
              {publishedVersions.length === 0 && <p className="text-xs text-amber-500 mt-1">No published prompt versions yet.</p>}
            </div>
            <div>
              <label className="label">Schema Version *</label>
              <select className="input" value={profileForm.schemaVersionId} onChange={(e) => setProfileForm((f) => ({ ...f, schemaVersionId: e.target.value }))} required>
                <option value="">Select schema version…</option>
                {schemaVersionOptions.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
              {schemaVersionOptions.length === 0 && <p className="text-xs text-amber-500 mt-1">No schema versions found.</p>}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            {FEATURE_FLAGS.map(({ key, label }) => (
              <div key={key} className="surface-2 border border-token rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-fg">{label}</span>
                <Toggle
                  checked={(profileForm as unknown as Record<string, boolean>)[key] ?? false}
                  onChange={(v) => setProfileForm((f) => ({ ...f, [key]: v }))}
                />
              </div>
            ))}
          </div>
          {profileError && <p className="text-red-500 text-sm surface-2 border border-red-500/30 rounded-lg px-3 py-2">{profileError}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save Profile'}</button>
            <button type="button" className="btn-secondary" onClick={() => setShowProfileForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => <div key={i} className="card p-6 h-24 animate-pulse" style={{ opacity: 0.6 }} />)}
        </div>
      ) : profiles.length === 0 ? (
        <div className="card p-12 text-center animate-fade-in-up">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'rgb(var(--accent) / 0.12)', color: 'rgb(var(--accent))' }}>
            <Layers size={22} />
          </div>
          <p className="text-sm font-medium text-fg">No subject profiles yet</p>
          <p className="text-sm text-mut mt-1">Add one so batches can be created for a subject.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((p) => (
            <div key={p.id} className="card p-5 transition hover:-translate-y-0.5 animate-fade-in-up" style={{ transitionDuration: 'var(--anim)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <h3 className="text-base font-semibold text-fg truncate">{p.subject.name}</h3>
                  <span className="text-xs text-mut whitespace-nowrap">Prompt: {p.promptVersion.prompt.name} v{p.promptVersion.versionNo}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => startEditProfile(p)} className="p-2 rounded-lg text-mut hover:text-fg hover:surface-2 transition" title="Edit"><Pencil size={15} /></button>
                  <button onClick={() => deleteProfile(p.subjectId, p.subject.name)} className="p-2 rounded-lg text-mut hover:text-red-500 hover:surface-2 transition" title="Delete"><Trash2 size={15} /></button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {FEATURE_FLAGS.map(({ key, label }) => {
                  const on = (p as unknown as Record<string, boolean>)[key]
                  return (
                    <span key={key} className={`badge ${on ? 'bg-green-100 text-green-700' : 'surface-2 text-mut'}`}>
                      {label}: {on ? 'on' : 'off'}
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
