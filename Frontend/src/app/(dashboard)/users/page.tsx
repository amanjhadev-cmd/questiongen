'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { statusColor, formatDate } from '@/lib/utils'
import type { User } from '@/types'
import { Plus } from 'lucide-react'

const ROLES = ['super_admin', 'admin', 'sme', 'intern']

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'intern' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    try {
      const res = await api.get<{ data: User[] }>('/users')
      setUsers(res.data)
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

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading…</div>

  return (
    <div className="p-8 space-y-6">
      <div className="page-header">
        <h1>Users</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">
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
              <input type="password" className="input" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required />
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
          <div key={u.id} className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">{u.name}</p>
              <p className="text-xs text-gray-400">{u.email} · {formatDate(u.createdAt)}</p>
            </div>
            <span className={`badge ${statusColor(u.role)}`}>{u.role}</span>
          </div>
        ))}
        {users.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">No users found.</p>}
      </div>
    </div>
  )
}
