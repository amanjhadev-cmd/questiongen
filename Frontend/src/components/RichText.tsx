'use client'
import katex from 'katex'
import 'katex/contrib/mhchem' // enables \ce{...} for chemistry
import 'katex/dist/katex.min.css'

/**
 * Renders text that may contain LaTeX math and chemistry, for all subjects:
 *  - inline math:  $...$   or  \(...\)
 *  - display math: $$...$$ or  \[...\]
 *  - chemistry via mhchem: \ce{2H2 + O2 -> 2H2O}
 * Non-math text is HTML-escaped (safe) and newlines become <br>.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderMath(tex: string, display: boolean): string {
  try {
    return katex.renderToString(tex, { throwOnError: false, displayMode: display, output: 'html' })
  } catch {
    return escapeHtml(tex)
  }
}

// Escape plain text and turn newlines into line breaks.
function renderPlain(s: string): string {
  return escapeHtml(s).replace(/\n/g, '<br/>')
}

// $$...$$ | \[...\] (display)  then  $...$ | \(...\) (inline)
const MATH_RE = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\$([^$\n]+?)\$|\\\(([\s\S]+?)\\\)/g

function toHtml(text: string): string {
  let out = ''
  let last = 0
  let m: RegExpExecArray | null
  MATH_RE.lastIndex = 0
  while ((m = MATH_RE.exec(text)) !== null) {
    out += renderPlain(text.slice(last, m.index))
    const display = m[1] !== undefined || m[2] !== undefined
    const tex = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? '').trim()
    out += renderMath(tex, display)
    last = m.index + m[0].length
  }
  out += renderPlain(text.slice(last))
  return out
}

export function RichText({ text, className }: { text?: string | null; className?: string }) {
  if (!text) return null
  return <span className={className} dangerouslySetInnerHTML={{ __html: toHtml(text) }} />
}
