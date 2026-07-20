'use client'
import { useEffect, useRef } from 'react'
import DOMPurify from 'isomorphic-dompurify'
import renderMathInElement from 'katex/contrib/auto-render'
import 'katex/contrib/mhchem' // \ce{...} chemistry
import 'katex/dist/katex.min.css'

/**
 * Renders question content for all subjects:
 *  - safe HTML (<p>, <b>, <sub>, tables, lists, …) via DOMPurify
 *  - LaTeX math ($...$, $$...$$, \(..\), \[..\]) + mhchem chemistry via KaTeX
 * Pass `html` for HTML content (nested production format) or `text` for plain
 * text (legacy) — plain text keeps its line breaks.
 */

const ALLOWED_TAGS = [
  'p', 'b', 'strong', 'i', 'em', 'u', 's', 'sub', 'sup', 'br', 'hr',
  'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'span', 'div', 'code', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'small',
]

export function RichText({ html, text, className }: { html?: string | null; text?: string | null; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const raw = html != null ? html : text != null ? text.replace(/\n/g, '<br/>') : ''

  useEffect(() => {
    if (!ref.current) return
    try {
      renderMathInElement(ref.current, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
        ],
        throwOnError: false,
      })
    } catch {
      /* leave raw text if KaTeX fails */
    }
  }, [raw])

  if (!raw) return null
  const clean = DOMPurify.sanitize(raw, { ALLOWED_TAGS, ALLOWED_ATTR: ['class'] })
  return <div ref={ref} className={`katex-content ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: clean }} />
}
