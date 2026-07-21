'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark' | 'system'
export type SidebarStyle = 'default' | 'floating' | 'compact'
export type RadiusStyle = 'sharp' | 'rounded' | 'pill'
export type Density = 'comfortable' | 'compact'
export type FontSize = 'small' | 'medium' | 'large'
export type AnimSpeed = 'slow' | 'normal' | 'fast'

export interface Preferences {
  theme: ThemeMode
  accent: string          // hex
  sidebar: SidebarStyle
  radius: RadiusStyle
  density: Density
  fontSize: FontSize
  animation: AnimSpeed
  glass: boolean
  blur: boolean
  shadows: boolean
}

export const DEFAULTS: Preferences = {
  theme: 'light',
  accent: '#00B8FF',
  sidebar: 'default',
  radius: 'rounded',
  density: 'comfortable',
  fontSize: 'medium',
  animation: 'normal',
  glass: false,
  blur: false,
  shadows: true,
}

interface PrefState extends Preferences {
  set: (patch: Partial<Preferences>) => void
  reset: () => void
}

export const usePrefs = create<PrefState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (patch) => set(patch),
      reset: () => set(DEFAULTS),
    }),
    { name: 'qf-appearance' },
  ),
)

export const ACCENT_PRESETS = ['#00B8FF', '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#F59E0B', '#10B981', '#14B8A6', '#1F3864']

export function hexToRgbTriplet(hex: string): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16) || 0
  const g = parseInt(full.slice(2, 4), 16) || 0
  const b = parseInt(full.slice(4, 6), 16) || 0
  return `${r} ${g} ${b}`
}

// A slightly lighter shade for hover/gradient states.
export function lightenTriplet(hex: string, amount = 28): string {
  const [r, g, b] = hexToRgbTriplet(hex).split(' ').map(Number)
  const up = (v: number) => Math.min(255, v + amount)
  return `${up(r)} ${up(g)} ${up(b)}`
}
