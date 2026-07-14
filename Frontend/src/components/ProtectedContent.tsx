'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Wraps sensitive content with anti-copying deterrents:
 *  - a tiled diagonal watermark (email + live timestamp) baked over everything,
 *    so any screenshot / photo carries the viewer's identity
 *  - disables text selection, right-click, copy, and image dragging
 *  - blocks copy / save / print / select-all keyboard shortcuts
 *  - blurs the content when the tab/window loses focus
 *
 * None of this can stop a phone camera, but it makes casual copying hard and
 * makes any leaked image traceable to the SME who was logged in.
 */
export function ProtectedContent({ email, children }: { email: string; children: ReactNode }) {
  const [stamp, setStamp] = useState(() => new Date().toLocaleString())
  const [obscured, setObscured] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Refresh the watermark timestamp periodically so a capture shows "now".
  useEffect(() => {
    const t = setInterval(() => setStamp(new Date().toLocaleString()), 30_000)
    return () => clearInterval(t)
  }, [])

  // Block copy / save / print / select-all shortcuts while mounted.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return
      const k = e.key.toLowerCase()
      const tag = (e.target as HTMLElement | null)?.tagName
      const inField = tag === 'INPUT' || tag === 'TEXTAREA'
      // Print/save are always blocked; copy/cut/select-all are allowed inside
      // the reviewer's own notes field so they can edit normally.
      if (k === 's' || k === 'p') { e.preventDefault(); e.stopPropagation(); return }
      if (!inField && ['c', 'x', 'a'].includes(k)) { e.preventDefault(); e.stopPropagation() }
    }
    function onBlur() { setObscured(true) }
    function onFocus() { setObscured(false) }
    function onVisibility() { setObscured(document.hidden) }

    window.addEventListener('keydown', onKey, true)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  // Build a repeating SVG watermark tile carrying email + timestamp.
  const label = `${email} · ${stamp}`
  const tile = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="190">
      <text x="20" y="95" transform="rotate(-30 170 95)"
        font-family="sans-serif" font-size="14" fill="#64748b" fill-opacity="0.18">${escapeXml(label)}</text>
    </svg>`,
  )

  return (
    <div
      ref={ref}
      className="relative select-none [&_textarea]:select-text [&_input]:select-text"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => {
        const tag = (e.target as HTMLElement).tagName
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') e.preventDefault()
      }}
      onDragStart={(e) => e.preventDefault()}
    >
      <div className={obscured ? 'blur-lg pointer-events-none transition' : 'transition'}>
        {children}
      </div>

      {/* Watermark overlay — above content, ignores pointer events */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20"
        style={{ backgroundImage: `url("data:image/svg+xml,${tile}")`, backgroundRepeat: 'repeat' }}
      />

      {/* Focus-loss shield */}
      {obscured && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <p className="text-sm font-medium text-gray-500">Hidden for security — return focus to this window to continue.</p>
        </div>
      )}
    </div>
  )
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string),
  )
}
