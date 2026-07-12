import { prisma } from '../../config/database'
import { Errors } from '../../utils/app-error'

// ── Boards ────────────────────────────────────────────────────────────────────

export async function listBoards() {
  return prisma.board.findMany({ orderBy: { name: 'asc' } })
}

export async function createBoard(name: string) {
  const existing = await prisma.board.findUnique({ where: { name } })
  if (existing) throw Errors.conflict(`Board '${name}' already exists`)
  return prisma.board.create({ data: { name } })
}

// ── Classes ───────────────────────────────────────────────────────────────────

export async function listClasses(boardId?: string) {
  return prisma.class.findMany({
    where: boardId ? { boardId } : undefined,
    include: { board: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  })
}

export async function createClass(boardId: string, name: string) {
  const board = await prisma.board.findUnique({ where: { id: boardId } })
  if (!board) throw Errors.notFound('Board')
  const existing = await prisma.class.findUnique({ where: { boardId_name: { boardId, name } } })
  if (existing) throw Errors.conflict(`Class '${name}' already exists in this board`)
  return prisma.class.create({ data: { boardId, name } })
}

// ── Subjects ──────────────────────────────────────────────────────────────────

export async function listSubjects(classId?: string) {
  return prisma.subject.findMany({
    where: classId ? { classId } : undefined,
    include: { class: { select: { id: true, name: true, board: { select: { id: true, name: true } } } } },
    orderBy: { name: 'asc' },
  })
}

export async function getSubject(id: string) {
  const subject = await prisma.subject.findUnique({
    where: { id },
    include: {
      class: { select: { id: true, name: true, board: { select: { id: true, name: true } } } },
      subjectProfile: true,
    },
  })
  if (!subject) throw Errors.notFound('Subject')
  return subject
}

export async function createSubject(classId: string, name: string, code: string) {
  const cls = await prisma.class.findUnique({ where: { id: classId } })
  if (!cls) throw Errors.notFound('Class')
  const existing = await prisma.subject.findUnique({ where: { classId_code: { classId, code } } })
  if (existing) throw Errors.conflict(`Subject with code '${code}' already exists in this class`)
  return prisma.subject.create({ data: { classId, name, code } })
}

// ── Chapters ──────────────────────────────────────────────────────────────────

export async function listChapters(subjectId?: string) {
  return prisma.chapter.findMany({
    where: subjectId ? { subjectId } : undefined,
    include: { subject: { select: { id: true, name: true, code: true } } },
    orderBy: { chapterNo: 'asc' },
  })
}

export async function getChapter(id: string) {
  const chapter = await prisma.chapter.findUnique({
    where: { id },
    include: {
      subject: { select: { id: true, name: true, code: true } },
      concepts: { orderBy: { name: 'asc' } },
    },
  })
  if (!chapter) throw Errors.notFound('Chapter')
  return chapter
}

export async function createChapter(subjectId: string, name: string, chapterNo: number) {
  const subject = await prisma.subject.findUnique({ where: { id: subjectId } })
  if (!subject) throw Errors.notFound('Subject')
  const existing = await prisma.chapter.findUnique({ where: { subjectId_chapterNo: { subjectId, chapterNo } } })
  if (existing) throw Errors.conflict(`Chapter number ${chapterNo} already exists in this subject`)
  return prisma.chapter.create({ data: { subjectId, name, chapterNo } })
}

// ── Concepts ──────────────────────────────────────────────────────────────────

export async function listConcepts(chapterId?: string) {
  return prisma.concept.findMany({
    where: chapterId ? { chapterId } : undefined,
    include: { chapter: { select: { id: true, name: true, chapterNo: true } } },
    orderBy: { name: 'asc' },
  })
}

export async function getConcept(id: string) {
  const concept = await prisma.concept.findUnique({
    where: { id },
    include: { chapter: { select: { id: true, name: true, chapterNo: true } } },
  })
  if (!concept) throw Errors.notFound('Concept')
  return concept
}

export async function createConcept(
  chapterId: string,
  name: string,
  uuid: string,
  shortNote?: string,
) {
  const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } })
  if (!chapter) throw Errors.notFound('Chapter')
  const existing = await prisma.concept.findUnique({ where: { uuid } })
  if (existing) throw Errors.conflict(`Concept with UUID '${uuid}' already exists`)
  return prisma.concept.create({ data: { chapterId, name, uuid, shortNote } })
}

export async function updateConcept(id: string, data: { name?: string; shortNote?: string }) {
  const concept = await prisma.concept.findUnique({ where: { id } })
  if (!concept) throw Errors.notFound('Concept')
  return prisma.concept.update({ where: { id }, data })
}

// ── Question Types ────────────────────────────────────────────────────────────

export async function listQuestionTypes() {
  return prisma.questionType.findMany({
    where: { isActive: true },
    orderBy: { code: 'asc' },
  })
}
