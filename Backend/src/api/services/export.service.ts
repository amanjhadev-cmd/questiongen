import ExcelJS from 'exceljs'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { prisma } from '../../config/database'
import { r2Client, R2_BUCKET, R2_PUBLIC_URL } from '../../config/r2'
import { buildExportKey } from '../../utils/r2-key'
import { Errors } from '../../utils/app-error'
import { logger } from '../../config/logger'
import { buildFinalJson, FinalQuestion } from './final-json-builder.service'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<string> {
  if (!r2Client) throw Errors.internal('R2 storage is not configured')
  await r2Client.send(
    new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: body, ContentType: contentType }),
  )
  return `${R2_PUBLIC_URL}/${key}`
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

// ── JSON Export ───────────────────────────────────────────────────────────────

export async function exportJson(batchId: string, requestedById: string) {
  const existing = await prisma.export.findFirst({
    where: { batchId, format: 'json', status: 'done' },
  })

  const exportRecord = existing
    ? await prisma.export.update({ where: { id: existing.id }, data: { status: 'processing' } })
    : await prisma.export.create({
        data: { name: `batch-${batchId}-json`, batchId, format: 'json', createdById: requestedById, status: 'processing' },
      })

  try {
    const questions = await buildFinalJson(batchId)
    const jsonContent = JSON.stringify({ questions, exportedAt: new Date().toISOString() }, null, 2)
    const buffer = Buffer.from(jsonContent, 'utf-8')

    const filename = `questions-${timestamp()}.json`
    const r2Key = buildExportKey(batchId, 'json', filename)
    const publicUrl = await uploadToR2(r2Key, buffer, 'application/json')

    const done = await prisma.export.update({
      where: { id: exportRecord.id },
      data: { r2Key, publicUrl, status: 'done', name: filename },
    })

    logger.info({ batchId, r2Key }, 'JSON export complete')
    return done
  } catch (err) {
    await prisma.export.update({ where: { id: exportRecord.id }, data: { status: 'failed' } })
    throw err
  }
}

// ── Excel Export ──────────────────────────────────────────────────────────────

export async function exportExcel(batchId: string, requestedById: string) {
  const exportRecord = await prisma.export.create({
    data: { name: `batch-${batchId}-excel`, batchId, format: 'excel', createdById: requestedById, status: 'processing' },
  })

  try {
    const questions = await buildFinalJson(batchId)
    const buffer = await buildExcelBuffer(questions)

    const filename = `questions-${timestamp()}.xlsx`
    const r2Key = buildExportKey(batchId, 'excel', filename)
    const publicUrl = await uploadToR2(r2Key, buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    const done = await prisma.export.update({
      where: { id: exportRecord.id },
      data: { r2Key, publicUrl, status: 'done', name: filename },
    })

    logger.info({ batchId, r2Key }, 'Excel export complete')
    return done
  } catch (err) {
    await prisma.export.update({ where: { id: exportRecord.id }, data: { status: 'failed' } })
    throw err
  }
}

async function buildExcelBuffer(questions: FinalQuestion[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Question Factory'
  wb.created = new Date()

  const ws = wb.addWorksheet('Questions')

  ws.columns = [
    { header: 'Question ID', key: 'id', width: 38 },
    { header: 'Question Text', key: 'question_text', width: 60 },
    { header: 'Type', key: 'question_type', width: 10 },
    { header: 'Marks', key: 'marks', width: 8 },
    { header: 'Difficulty', key: 'difficulty', width: 12 },
    { header: "Bloom's Level", key: 'bloom_level', width: 15 },
    { header: 'Option A', key: 'option_a', width: 35 },
    { header: 'Option B', key: 'option_b', width: 35 },
    { header: 'Option C', key: 'option_c', width: 35 },
    { header: 'Option D', key: 'option_d', width: 35 },
    { header: 'Correct Option', key: 'correct_option', width: 15 },
    { header: 'Correct Answer (TF)', key: 'correct_answer', width: 20 },
    { header: 'Explanation', key: 'explanation', width: 80 },
    { header: 'Hint', key: 'hint', width: 40 },
    { header: 'Tags', key: 'tags', width: 30 },
    { header: 'Diagram Required', key: 'diagram_required', width: 18 },
    { header: 'Diagram URL', key: 'diagram_url', width: 50 },
    { header: 'Is NCERT', key: 'is_ncert', width: 12 },
    { header: 'NCERT Page', key: 'ncert_page', width: 12 },
    { header: 'Language', key: 'language', width: 10 },
    { header: 'Board', key: 'board', width: 15 },
    { header: 'Class', key: 'class', width: 15 },
    { header: 'Subject', key: 'subject', width: 20 },
    { header: 'Batch UUID', key: 'batch_uuid', width: 38 },
    { header: 'Concept UUIDs', key: 'concept_uuids', width: 40 },
  ]

  // Style header row
  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } }
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }

  for (const q of questions) {
    const opts = Array.isArray(q.options)
      ? (q.options as Array<{ key: string; text: string }>)
      : []
    const getOpt = (key: string) => opts.find((o) => o.key === key)?.text ?? ''

    ws.addRow({
      id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      marks: q.marks,
      difficulty: q.difficulty,
      bloom_level: q.bloom_level,
      option_a: getOpt('A'),
      option_b: getOpt('B'),
      option_c: getOpt('C'),
      option_d: getOpt('D'),
      correct_option: q.correct_option ?? '',
      correct_answer: q.correct_answer !== undefined ? String(q.correct_answer) : '',
      explanation: q.explanation,
      hint: (q.hint as string | undefined) ?? '',
      tags: Array.isArray(q.tags) ? (q.tags as string[]).join(', ') : '',
      diagram_required: String(q.diagram_required ?? false),
      diagram_url: q._meta.diagram_url ?? '',
      is_ncert: String(q.is_ncert ?? false),
      ncert_page: (q.ncert_page as number | undefined) ?? '',
      language: (q.language as string | undefined) ?? 'en',
      board: q._meta.board,
      class: q._meta.class,
      subject: q._meta.subject,
      batch_uuid: q._meta.batch_uuid,
      concept_uuids: q._meta.concept_uuids?.join(', ') ?? '',
    })
  }

  // Auto-wrap text in question/explanation columns
  ws.getColumn('question_text').alignment = { wrapText: true, vertical: 'top' }
  ws.getColumn('explanation').alignment = { wrapText: true, vertical: 'top' }

  return Buffer.from(await wb.xlsx.writeBuffer() as ArrayBuffer)
}

// ── PDF Export ────────────────────────────────────────────────────────────────

export async function exportPdf(batchId: string, requestedById: string) {
  const exportRecord = await prisma.export.create({
    data: { name: `batch-${batchId}-pdf`, batchId, format: 'pdf', createdById: requestedById, status: 'processing' },
  })

  try {
    const questions = await buildFinalJson(batchId)
    const buffer = await buildPdfBuffer(batchId, questions)

    const filename = `questions-${timestamp()}.pdf`
    const r2Key = buildExportKey(batchId, 'pdf', filename)
    const publicUrl = await uploadToR2(r2Key, buffer, 'application/pdf')

    const done = await prisma.export.update({
      where: { id: exportRecord.id },
      data: { r2Key, publicUrl, status: 'done', name: filename },
    })

    logger.info({ batchId, r2Key }, 'PDF export complete')
    return done
  } catch (err) {
    await prisma.export.update({ where: { id: exportRecord.id }, data: { status: 'failed' } })
    throw err
  }
}

async function buildPdfBuffer(batchId: string, questions: FinalQuestion[]): Promise<Buffer> {
  const puppeteer = await import('puppeteer')

  const html = buildPdfHtml(questions)

  const browser = await puppeteer.default.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ?? '/opt/pw-browsers/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdfUint8 = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      printBackground: true,
    })
    return Buffer.from(pdfUint8)
  } finally {
    await browser.close()
  }
}

function buildPdfHtml(questions: FinalQuestion[]): string {
  // KaTeX CSS is inlined — in production this URL should be replaced with the actual CDN
  // or bundled CSS. Using a simplified inline version here.
  const katexCss = `
    .katex { font: normal 1.1em KaTeX_Main, Times New Roman, serif; }
    .katex-display { display: block; margin: 1em 0; text-align: center; }
  `

  const questionHtml = questions
    .map((q, i) => {
      const opts = Array.isArray(q.options)
        ? (q.options as Array<{ key: string; text: string }>)
        : []
      const optionsHtml = opts.length > 0
        ? `<ol type="A" class="options">${opts.map((o) => `<li>${escHtml(o.text)}</li>`).join('')}</ol>`
        : ''

      const tfHtml = q.question_type === 'TF'
        ? `<p class="tf"><strong>Answer:</strong> ${q.correct_answer ? 'True' : 'False'}</p>`
        : ''

      const diagramHtml = q._meta.diagram_url
        ? `<figure><img src="${escHtml(q._meta.diagram_url)}" alt="${escHtml(q._meta.diagram_alt_text ?? '')}" style="max-width:100%"></figure>`
        : ''

      return `
        <div class="question">
          <p class="q-num"><strong>Q${i + 1}.</strong> ${escHtml(q.question_text)}</p>
          ${diagramHtml}
          ${optionsHtml}
          ${tfHtml}
          <p class="meta">
            [${q.question_type} | ${q.marks} mark(s) | ${q.difficulty} | ${q.bloom_level}]
          </p>
          <details class="explanation">
            <summary>Explanation</summary>
            <p>${escHtml(q.explanation)}</p>
          </details>
        </div>
      `
    })
    .join('\n<hr class="q-divider">\n')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Question Bank Export</title>
  <style>
    ${katexCss}
    body { font-family: Georgia, serif; font-size: 12pt; color: #111; }
    h1 { font-size: 16pt; text-align: center; margin-bottom: 4mm; }
    .sub { text-align: center; font-size: 10pt; color: #555; margin-bottom: 8mm; }
    .question { margin: 6mm 0; }
    .q-num { font-size: 12pt; margin-bottom: 3mm; }
    .options { margin-left: 8mm; }
    .meta { font-size: 9pt; color: #555; margin-top: 3mm; }
    .explanation summary { cursor: pointer; color: #1a56db; }
    .q-divider { border: none; border-top: 1px solid #ddd; margin: 5mm 0; }
    @media print { details { display: none; } }
  </style>
</head>
<body>
  <h1>Question Bank</h1>
  <p class="sub">
    ${questions[0]?._meta.board ?? ''} &bull;
    ${questions[0]?._meta.class ?? ''} &bull;
    ${questions[0]?._meta.subject ?? ''} &bull;
    Batch: ${questions[0]?._meta.batch_uuid ?? ''}
  </p>
  ${questionHtml}
</body>
</html>`
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── List exports for a batch ──────────────────────────────────────────────────

export async function listExports(batchId: string) {
  const batch = await prisma.batch.findUnique({ where: { id: batchId } })
  if (!batch) throw Errors.notFound('Batch')

  return prisma.export.findMany({
    where: { batchId },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

// ── Advance batch to export_complete ─────────────────────────────────────────

export async function markBatchExportComplete(batchId: string) {
  const batch = await prisma.batch.findUnique({ where: { id: batchId } })
  if (!batch) throw Errors.notFound('Batch')

  if (batch.status !== 'sme_review_complete') {
    throw Errors.validation(
      `Batch must be in 'sme_review_complete' to mark export complete. Current: '${batch.status}'`,
    )
  }

  // Verify JSON, Excel, PDF all done
  const [jsonDone, excelDone, pdfDone] = await Promise.all([
    prisma.export.count({ where: { batchId, format: 'json', status: 'done' } }),
    prisma.export.count({ where: { batchId, format: 'excel', status: 'done' } }),
    prisma.export.count({ where: { batchId, format: 'pdf', status: 'done' } }),
  ])

  if (!jsonDone || !excelDone || !pdfDone) {
    throw Errors.validation(
      `All three export formats (JSON, Excel, PDF) must be complete before advancing. ` +
      `JSON: ${jsonDone ? '✓' : '✗'}, Excel: ${excelDone ? '✓' : '✗'}, PDF: ${pdfDone ? '✓' : '✗'}`,
    )
  }

  return prisma.batch.update({
    where: { id: batchId },
    data: { status: 'export_complete' },
  })
}
