'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { statusColor, formatDate } from '@/lib/utils'
import type { User, Subject } from '@/types'
import { Plus, Pencil, UserX, UserCheck, BookOpen } from 'lucide-react'

const ROLES = ['super_admin', 'admin', 'sme', 'intern']

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)

  // Create
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'intern' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Edit
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ name: string; role: string; isActive: boolean }>({ name: '', role: 'intern', isActive: true })

  // Subject assignment
  const [subjectsForId, setSubjectsForId] = useState<string | null>(null)
  const [chosenSubjects, setChosenSubjects] = useState<Set<string>>(new Set())
  const [savingSubjects, setSavingSubjects] = useState(false)

  async function load() {
    try {
      const [uRes, sRes] = await Promise.all([
        api.get<{ data: User[] }>('/users'),
        api.get<Subject[]>('/master/subjects'),
      ])
      setUsers(uRes.data)
      setSubjects(sRes)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.post('/users', form)
      setForm({ name: '', email: '', password: '', role: 'intern' })
      setShowForm(false)
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed')
    }
    setSaving(false)
  }

  function startEdit(u: User) {
    setEditId(u.id)
    setEditForm({ name: u.name, role: u.role, isActive: u.isActive })
    setSubjectsForId(null)
  }

  async function saveEdit() {
    if (!editId) return
    try {
      await api.put(`/users/${editId}`, editForm)
      setEditId(null)
      await load()
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
  }

  async function toggleActive(u: User) {
    try {
      if (u.isActive) {
        if (!confirm(`Deactivate ${u.name}? They will no longer be able to sign in.`)) return
        await api.delete(`/users/${u.id}`)
      } else {
        await api.put(`/users/${u.id}`, { isActive: true })
      }
      await load()
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
  }

  function startSubjects(u: User) {
    setSubjectsForId(u.id)
    setChosenSubjects(new Set((u.subjects ?? []).map((s) => s.id)))
    setEditId(null)
  }

  function toggleSubject(id: string) {
    setChosenSubjects((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function saveSubjects() {
    if (!subjectsForId) return
    setSavingSubjects(true)
    try {
      await api.put(`/users/${subjectsForId}/subjects`, { subjectIds: Array.from(chosenSubjects) })
      setSubjectsForId(null)
      await load()
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
    setSavingSubjects(false)
  }

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading…</div>

  return (
    <div className="p-8 space-y-6">
      <div className="page-header">
        <h1>Users</h1>
        <button onClick={() => { setShowForm(true); setEditId(null); setSubjectsForId(null) }} className="btn-primary">
          <Plus size={15} /> Add User
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card p-5 space-y-4 border-2 border-brand">
          <h2 className="text-base font-semibold">New User</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name *</label>
              <input className="input" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Email *</label>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Password *</label>
              <input type="password" className="input" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required minLength={8} />
            </div>
            <div>
              <label className="label">Role *</label>
              <select className="input" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create User'}</button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="card divide-y divide-gray-50">
        {users.map((u) => (
          <div key={u.id} className={`px-5 py-4 ${!u.isActive ? 'opacity-60' : ''}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  {u.name}
                  {!u.isActive && <span className="ml-2 text-xs text-red-500">(inactive)</span>}
                </p>
                <p className="text-xs text-gray-400">{u.email} · {formatDate(u.createdAt)}</p>
                {u.role === 'sme' && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(u.subjects ?? []).length === 0 && <span className="text-xs text-orange-500">No subjects assigned</span>}
                    {(u.subjects ?? []).map((s) => (
                      <span key={s.id} className="badge bg-brand-muted text-brand text-xs">{s.name}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`badge ${statusColor(u.role)}`}>{u.role}</span>
                {u.role === 'sme' && (
                  <button onClick={() => startSubjects(u)} className="text-gray-400 hover:text-brand p-1" title="Assign subjects"><BookOpen size={15} /></button>
                )}
                <button onClick={() => startEdit(u)} className="text-gray-400 hover:text-brand p-1" title="Edit"><Pencil size={15} /></button>
                <button onClick={() => toggleActive(u)} className={`p-1 ${u.isActive ? 'text-gray-400 hover:text-red-500' : 'text-gray-400 hover:text-green-600'}`} title={u.isActive ? 'Deactivate' : 'Reactivate'}>
                  {u.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                </button>
              </div>
            </div>

            {/* Edit inline */}
            {editId === u.id && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="label">Name</label>
                    <input className="input" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Role</label>
                    <select className="input" value={editForm.role} onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
                      <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.checked }))} />
                      Active
                    </label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="btn-primary text-sm">Save Changes</button>
                  <button onClick={() => setEditId(null)} className="btn-secondary text-sm">Cancel</button>
                </div>
              </div>
            )}

            {/* Subject assignment inline */}
            {subjectsForId === u.id && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                <p className="text-sm font-semibold">Assign subjects to {u.name}</p>
                <p className="text-xs text-gray-500">This SME will see batches in these subjects (plus any batch assigned directly to them).</p>
                <div className="flex flex-wrap gap-2">
                  {subjects.map((s) => (
                    <label key={s.id} className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border cursor-pointer ${chosenSubjects.has(s.id) ? 'border-brand bg-brand-muted text-brand' : 'border-gray-200 text-gray-600'}`}>
                      <input type="checkbox" checked={chosenSubjects.has(s.id)} onChange={() => toggleSubject(s.id)} className="hidden" />
                      {s.name} <span className="text-xs opacity-60">({s.code})</span>
                    </label>
                  ))}
                  {subjects.length === 0 && <span className="text-xs text-gray-400">No subjects exist yet.</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={saveSubjects} disabled={savingSubjects} className="btn-primary text-sm">{savingSubjects ? 'Saving…' : 'Save Subjects'}</button>
                  <button onClick={() => setSubjectsForId(null)} className="btn-secondary text-sm">Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {users.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">No users found.</p>}
      </div>
    </div>
  )
}
