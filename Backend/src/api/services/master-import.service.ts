import * as XLSX from 'xlsx'
import { prisma } from '../../config/database'
import { Errors } from '../../utils/app-error'
import { logger } from '../../config/logger'

interface RawRow {
  BOARD?: string
  CLASS?: string | number
  SUBJECT?: string
  'CHAPTER NO'?: string | number
  'CHAPTER NAME'?: string
  'CHAPTER UUID'?: string
  'CONCEPT NO'?: string | number
  'CONCEPT NAME'?: string
  'CONCEPT UUID'?: string
}

export interface ImportSummary {
  totalRows: number
  boards: number
  classes: number
  subjects: number
  chapters: number
  conceptsCreated: number
  conceptsSkipped: number
  errors: Array<{ row: number; message: string }>
}

const REQUIRED_HEADERS = [
  'BOARD', 'CLASS', 'SUBJECT', 'CHAPTER NO', 'CHAPTER NAME', 'CONCEPT NAME', 'CONCEPT UUID',
]

// Derive a subject code (unique per class) from the subject name.
function subjectCode(name: string): string {
  const base = name.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 16)
  return base.length >= 2 ? base : `SUB${base}`
}

export async function importMasterFromExcel(buffer: Buffer): Promise<ImportSummary> {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) throw Errors.validation('The uploaded file has no sheets')

  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: '' })
  if (rows.length === 0) throw Errors.validation('The sheet is empty')

  // Validate headers
  const headers = Object.keys(rows[0])
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h))
  if (missing.length > 0) {
    throw Errors.validation(`Missing required column(s): ${missing.join(', ')}`)
  }

  const summary: ImportSummary = {
    totalRows: rows.length,
    boards: 0, classes: 0, subjects: 0, chapters: 0,
    conceptsCreated: 0, conceptsSkipped: 0, errors: [],
  }

  // Caches keyed by natural key -> db id, so each level is created once.
  const boardCache = new Map<string, string>()
  const classCache = new Map<string, string>()
  const subjectCache = new Map<string, string>()
  const subjectCodeUsed = new Map<string, Set<string>>() // classId -> set of codes
  const chapterCache = new Map<string, string>()
  const conceptRows: Array<{ chapterId: string; name: string; uuid: string }> = []
  const seenConceptUuids = new Set<string>()

  async function ensureBoard(name: string): Promise<string> {
    if (boardCache.has(name)) return boardCache.get(name)!
    const board = await prisma.board.upsert({
      where: { name }, update: {}, create: { name },
    })
    boardCache.set(name, board.id)
    summary.boards++
    return board.id
  }

  async function ensureClass(boardId: string, name: string): Promise<string> {
    const key = `${boardId}|${name}`
    if (classCache.has(key)) return classCache.get(key)!
    const cls = await prisma.class.upsert({
      where: { boardId_name: { boardId, name } }, update: {}, create: { boardId, name },
    })
    classCache.set(key, cls.id)
    summary.classes++
    return cls.id
  }

  async function ensureSubject(classId: string, name: string): Promise<string> {
    const key = `${classId}|${name}`
    if (subjectCache.has(key)) return subjectCache.get(key)!
    // Try to find an existing subject by name in this class first
    const existing = await prisma.subject.findFirst({ where: { classId, name } })
    if (existing) {
      subjectCache.set(key, existing.id)
      return existing.id
    }
    // Generate a unique code within the class
    const used = subjectCodeUsed.get(classId) ?? new Set<string>()
    let code = subjectCode(name)
    let n = 1
    while (used.has(code)) { code = `${subjectCode(name).slice(0, 14)}${n++}` }
    const existingByCode = await prisma.subject.findUnique({ where: { classId_code: { classId, code } } })
    if (existingByCode) { code = `${code}${Date.now().toString().slice(-3)}` }
    used.add(code)
    subjectCodeUsed.set(classId, used)
    const subject = await prisma.subject.create({ data: { classId, name, code } })
    subjectCache.set(key, subject.id)
    summary.subjects++
    return subject.id
  }

  async function ensureChapter(subjectId: string, chapterNo: number, name: string, uuid?: string): Promise<string> {
    const key = `${subjectId}|${chapterNo}`
    if (chapterCache.has(key)) return chapterCache.get(key)!
    const existing = await prisma.chapter.findUnique({
      where: { subjectId_chapterNo: { subjectId, chapterNo } },
    })
    if (existing) {
      chapterCache.set(key, existing.id)
      return existing.id
    }
    const chapter = await prisma.chapter.create({
      data: { subjectId, chapterNo, name, uuid: uuid || null },
    })
    chapterCache.set(key, chapter.id)
    summary.chapters++
    return chapter.id
  }

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const rowNo = i + 2 // account for header row in the sheet
    try {
      const boardName = String(r.BOARD ?? '').trim()
      const className = String(r.CLASS ?? '').trim()
      const subjectName = String(r.SUBJECT ?? '').trim()
      const chapterNoRaw = String(r['CHAPTER NO'] ?? '').trim()
      const chapterName = String(r['CHAPTER NAME'] ?? '').trim()
      const chapterUuid = String(r['CHAPTER UUID'] ?? '').trim()
      const conceptName = String(r['CONCEPT NAME'] ?? '').trim()
      const conceptUuid = String(r['CONCEPT UUID'] ?? '').trim()

      if (!boardName || !className || !subjectName || !chapterName || !conceptName || !conceptUuid) {
        summary.errors.push({ row: rowNo, message: 'Missing required value in row' })
        continue
      }
      const chapterNo = parseInt(chapterNoRaw, 10)
      if (Number.isNaN(chapterNo)) {
        summary.errors.push({ row: rowNo, message: `Invalid CHAPTER NO '${chapterNoRaw}'` })
        continue
      }

      const boardId = await ensureBoard(boardName)
      const classId = await ensureClass(boardId, className)
      const subjectId = await ensureSubject(classId, subjectName)
      const chapterId = await ensureChapter(subjectId, chapterNo, chapterName, chapterUuid)

      if (seenConceptUuids.has(conceptUuid)) {
        summary.conceptsSkipped++
        continue
      }
      seenConceptUuids.add(conceptUuid)
      conceptRows.push({ chapterId, name: conceptName, uuid: conceptUuid })
    } catch (e: unknown) {
      summary.errors.push({ row: rowNo, message: e instanceof Error ? e.message : 'Row failed' })
    }
  }

  // Bulk insert concepts; skip any UUIDs that already exist in the DB.
  if (conceptRows.length > 0) {
    const existing = await prisma.concept.findMany({
      where: { uuid: { in: conceptRows.map((c) => c.uuid) } },
      select: { uuid: true },
    })
    const existingSet = new Set(existing.map((e: { uuid: string }) => e.uuid))
    const toCreate = conceptRows.filter((c) => !existingSet.has(c.uuid))
    summary.conceptsSkipped += conceptRows.length - toCreate.length
    if (toCreate.length > 0) {
      const result = await prisma.concept.createMany({ data: toCreate, skipDuplicates: true })
      summary.conceptsCreated += result.count
    }
  }

  logger.info({ summary }, 'Excel master-data import complete')
  return summary
}
