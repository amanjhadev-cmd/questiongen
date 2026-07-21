'use client'
import { useEffect } from 'react'
import { usePrefs, hexToRgbTriplet, lightenTriplet } from '@/lib/theme'

const RADIUS_MAP: Record<string, [string, string]> = {
  sharp: ['8px', '6px'],
  rounded: ['16px', '12px'],
  pill: ['26px', '18px'],
}
const ANIM_MAP: Record<string, string> = { slow: '400ms', normal: '220ms', fast: '110ms' }
const FONT_MAP: Record<string, number> = { small: 15, medium: 16, large: 17.5 }

/**
 * Applies the Appearance preferences to the document root as CSS variables /
 * data-attributes so the whole app re-themes live. Renders nothing.
 */
export function ThemeProvider() {
  const prefs = usePrefs()

  useEffect(() => {
    const root = document.documentElement

    // Theme (resolve "system")
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const resolved = prefs.theme === 'system' ? (media.matches ? 'dark' : 'light') : prefs.theme
      root.setAttribute('data-theme', resolved)
      root.style.setProperty(
        '--shadow',
        prefs.shadows
          ? resolved === 'dark' ? '0 6px 30px rgb(0 0 0 / 0.45)' : '0 4px 20px rgb(0 0 0 / 0.08)'
          : 'none',
      )
    }
    apply()
    if (prefs.theme === 'system') media.addEventListener('change', apply)

    // Accent
    root.style.setProperty('--accent', hexToRgbTriplet(prefs.accent))
    root.style.setProperty('--accent-light', lightenTriplet(prefs.accent))

    // Radius
    const [r, rs] = RADIUS_MAP[prefs.radius] ?? RADIUS_MAP.rounded
    root.style.setProperty('--radius', r)
    root.style.setProperty('--radius-sm', rs)

    // Density + font size → root font-size (rem-based spacing scales with it)
    const base = FONT_MAP[prefs.fontSize] ?? 16
    root.style.fontSize = `${prefs.density === 'compact' ? base - 0.5 : base}px`

    // Motion
    root.style.setProperty('--anim', ANIM_MAP[prefs.animation] ?? '220ms')

    // Effects
    root.style.setProperty('--glass', prefs.glass ? '1' : '0')
    root.style.setProperty('--blur', prefs.blur ? '14px' : '0px')

    // Sidebar style hook (read by the dashboard layout)
    root.setAttribute('data-sidebar', prefs.sidebar)

    return () => media.removeEventListener('change', apply)
  }, [prefs.theme, prefs.accent, prefs.radius, prefs.density, prefs.fontSize, prefs.animation, prefs.glass, prefs.blur, prefs.shadows, prefs.sidebar])

  return null
}
