# 12 — Rendering Engine

## Overview

The Rendering Engine converts raw question JSON fields into display-ready HTML. It runs on the frontend (React components) and also on the backend for PDF generation (Puppeteer).

## Supported Render Types

| type | Trigger | Component |
|---|---|---|
| `katex` | Field has `rendering_rule.type: "katex"` | `KatexRenderer` |
| `html` | Field has `rendering_rule.type: "html"` | `HtmlRenderer` (sanitised) |
| `plain` | Field has `rendering_rule.type: "plain"` | Plain `<span>` |
| `image` | Field has `rendering_rule.type: "image"` | `<img>` with `diagram_alt_text` |
| `table` | Field has `rendering_rule.type: "table"` | `TableRenderer` |

---

## KaTeX Rendering

LaTeX math expressions in question text are delimited by:
- Inline: `$...$` or `\(...\)`
- Block: `$$...$$` or `\[...\]`

```tsx
import katex from 'katex'
import 'katex/dist/katex.min.css'

function KatexRenderer({ text }: { text: string }) {
  const html = renderMixedContent(text)
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

function renderMixedContent(text: string): string {
  // Split on $...$ and $$...$$ delimiters
  // Render math segments with katex.renderToString()
  // Pass plain segments through DOMPurify
  return processedHtml
}
```

KaTeX rendering is used for:
- `question_text`
- `explanation`
- `hint`
- `options[].text`
- `blanks[].answer`

---

## Chemistry Notation

Chemical formulae in question text use standard notation that KaTeX handles:
- Subscripts: `H₂O` → written as `$\text{H}_2\text{O}$`
- Superscripts: `Ca²⁺` → `$\text{Ca}^{2+}$`
- Reaction arrows: `→` (Unicode) or `$\rightarrow$`

The LLM is instructed in the prompt to use KaTeX notation for all chemistry.

---

## Physics Notation

- Units: `$\text{m/s}^2$`, `$\text{kg·m}^{-3}$`
- Vectors: `$\vec{F}$`
- Greek letters: `$\alpha$`, `$\theta$`, `$\Delta$`

---

## Tables

Match-the-following questions render as an HTML table:

```tsx
function TableRenderer({ columnA, columnB }: MatchQuestion) {
  return (
    <table className="match-table">
      <thead>
        <tr><th>Column A</th><th>Column B</th></tr>
      </thead>
      <tbody>
        {columnA.map((item, i) => (
          <tr key={i}>
            <td>{item.key}. <KatexRenderer text={item.text} /></td>
            <td>{columnB[i]?.key}. <KatexRenderer text={columnB[i]?.text} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

---

## Images (Diagrams)

```tsx
function DiagramRenderer({ url, altText }: { url: string; altText: string }) {
  return (
    <figure className="diagram-figure">
      <img src={url} alt={altText} className="max-w-full h-auto" />
      <figcaption className="text-sm text-gray-500">{altText}</figcaption>
    </figure>
  )
}
```

Images are served from Cloudflare R2 via CDN. The frontend does not proxy images.

---

## HTML Sanitisation

Any field with `rendering_rule.type: "html"` is passed through DOMPurify before rendering:

```tsx
import DOMPurify from 'dompurify'

const clean = DOMPurify.sanitize(rawHtml, {
  ALLOWED_TAGS: ['b', 'i', 'u', 'em', 'strong', 'sub', 'sup', 'br', 'p', 'span'],
  ALLOWED_ATTR: ['class'],
})
```

No `<script>`, `<iframe>`, or event attributes are ever allowed.

---

## PDF Rendering (Backend)

For PDF export, Puppeteer renders the same HTML templates used by the frontend:

1. Build question HTML string using the same `renderMixedContent()` logic (Node.js version)
2. Include KaTeX CSS inline
3. Load in Puppeteer headless browser
4. Print to PDF with A4 page size, 1cm margins
5. Stream PDF buffer to R2 upload

KaTeX on Node.js:
```typescript
import katex from 'katex'
const math = katex.renderToString('\\frac{1}{2}', { throwOnError: false })
```

---

## Rendering in SME Review

SME sees fully rendered questions — the same output that will appear in the PDF export. This ensures SME reviews what students will actually see, not raw JSON.

## Rendering Priority

1. `diagram_url` is rendered first (above question text)
2. `question_text` with KaTeX
3. Options (MCQ) or blanks (FIB) or columns (MATCH)
4. `explanation` (collapsed by default in SME view, expandable)
5. `hint` (hidden by default, shown on toggle)
6. Metadata strip: difficulty | bloom_level | marks | concept_uuid
