'use client'
import type { ReactNode } from 'react'
import { Check } from 'lucide-react'

// iOS-style animated switch
export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition"
      style={{ background: checked ? 'rgb(var(--accent))' : 'rgb(var(--border))', transitionDuration: 'var(--anim)' }}
    >
      <span
        className="inline-block h-5 w-5 rounded-full bg-white shadow-md transition"
        style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)', transitionDuration: 'var(--anim)' }}
      />
    </button>
  )
}

export interface SegOption<T extends string> { value: T; label: string; icon?: ReactNode }

// Segmented control (pill selector)
export function Segmented<T extends string>({
  value, options, onChange, size = 'md',
}: {
  value: T
  options: SegOption<T>[]
  onChange: (v: T) => void
  size?: 'sm' | 'md'
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-token surface-2 p-1">
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex items-center gap-1.5 rounded-xl font-medium transition ${size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'} ${active ? 'text-white' : 'text-mut hover:text-fg'}`}
            style={{ background: active ? 'rgb(var(--accent))' : 'transparent', transitionDuration: 'var(--anim)' }}
          >
            {o.icon}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// Accent color swatch
export function Swatch({ color, active, onClick }: { color: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative h-8 w-8 rounded-full transition hover:scale-110"
      style={{ background: color, transitionDuration: 'var(--anim)', boxShadow: active ? `0 0 0 3px rgb(var(--surface)), 0 0 0 5px ${color}` : 'none' }}
      aria-label={color}
    >
      {active && <Check size={15} className="absolute inset-0 m-auto text-white" strokeWidth={3} />}
    </button>
  )
}

// A single setting row: label + description on the left, control on the right
export function SettingRow({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">{title}</p>
        {description && <p className="text-xs text-mut mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

// Premium settings card
export function SettingCard({ title, description, icon, children }: { title: string; description?: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="card p-6 animate-fade-in-up">
      <div className="flex items-start gap-3 mb-4">
        {icon && (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgb(var(--accent) / 0.12)', color: 'rgb(var(--accent))' }}>
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-base font-semibold text-fg">{title}</h2>
          {description && <p className="text-sm text-mut mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

// Animated success toast
export function Toast({ show, message }: { show: boolean; message: string }) {
  if (!show) return null
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-2xl animate-toast-in"
      style={{ background: 'rgb(var(--accent))' }}
    >
      <Check size={16} strokeWidth={3} />
      {message}
    </div>
  )
}
