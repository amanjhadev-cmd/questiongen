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

export async function updateBoard(id: string, name: string) {
  const board = await prisma.board.findUnique({ where: { id } })
  if (!board) throw Errors.notFound('Board')
  const clash = await prisma.board.findFirst({ where: { name, id: { not: id } } })
  if (clash) throw Errors.conflict(`Board '${name}' already exists`)
  return prisma.board.update({ where: { id }, data: { name } })
}

export async function deleteBoard(id: string) {
  const board = await prisma.board.findUnique({ where: { id } })
  if (!board) throw Errors.notFound('Board')
  const classCount = await prisma.class.count({ where: { boardId: id } })
  if (classCount > 0) {
    throw Errors.conflict(`Cannot delete: board has ${classCount} class(es). Delete them first.`)
  }
  await prisma.board.delete({ where: { id } })
  return { id, deleted: true }
}

// ── Classes ───────────────────────────────────────────────────────────────────

export async function listClasses(boardId?: string) {
  return prisma.class.findMany({
    where: boardId ? { boardId } : undefined,
    include: { board: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  })
}

export async function getClass(id: string) {
  const cls = await prisma.class.findUnique({
    where: { id },
    include: { board: { select: { id: true, name: true } } },
  })
  if (!cls) throw Errors.notFound('Class')
  return cls
}

export async function createClass(boardId: string, name: string) {
  const board = await prisma.board.findUnique({ where: { id: boardId } })
  if (!board) throw Errors.notFound('Board')
  const existing = await prisma.class.findUnique({ where: { boardId_name: { boardId, name } } })
  if (existing) throw Errors.conflict(`Class '${name}' already exists in this board`)
  return prisma.class.create({ data: { boardId, name } })
}

export async function updateClass(id: string, name: string) {
  const cls = await prisma.class.findUnique({ where: { id } })
  if (!cls) throw Errors.notFound('Class')
  const clash = await prisma.class.findFirst({ where: { boardId: cls.boardId, name, id: { not: id } } })
  if (clash) throw Errors.conflict(`Class '${name}' already exists in this board`)
  return prisma.class.update({ where: { id }, data: { name } })
}

export async function deleteClass(id: string) {
  const cls = await prisma.class.findUnique({ where: { id } })
  if (!cls) throw Errors.notFound('Class')
  const subjectCount = await prisma.subject.count({ where: { classId: id } })
  if (subjectCount > 0) {
    throw Errors.conflict(`Cannot delete: class has ${subjectCount} subject(s). Delete them first.`)
  }
  await prisma.class.delete({ where: { id } })
  return { id, deleted: true }
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

export async function updateSubject(id: string, data: { name?: string; code?: string }) {
  const subject = await prisma.subject.findUnique({ where: { id } })
  if (!subject) throw Errors.notFound('Subject')
  if (data.code) {
    const clash = await prisma.subject.findFirst({
      where: { classId: subject.classId, code: data.code, id: { not: id } },
    })
    if (clash) throw Errors.conflict(`Subject with code '${data.code}' already exists in this class`)
  }
  return prisma.subject.update({ where: { id }, data })
}

export async function deleteSubject(id: string) {
  const subject = await prisma.subject.findUnique({ where: { id } })
  if (!subject) throw Errors.notFound('Subject')
  const [chapters, batches, prompts, profile] = await Promise.all([
    prisma.chapter.count({ where: { subjectId: id } }),
    prisma.batch.count({ where: { subjectId: id } }),
    prisma.prompt.count({ where: { subjectId: id } }),
    prisma.subjectProfile.findUnique({ where: { subjectId: id } }),
  ])
  const blockers: string[] = []
  if (chapters > 0) blockers.push(`${chapters} chapter(s)`)
  if (batches > 0) blockers.push(`${batches} batch(es)`)
  if (prompts > 0) blockers.push(`${prompts} prompt(s)`)
  if (profile) blockers.push('a subject profile')
  if (blockers.length > 0) {
    throw Errors.conflict(`Cannot delete subject: it still has ${blockers.join(', ')}.`)
  }
  await prisma.smeSubject.deleteMany({ where: { subjectId: id } })
  await prisma.subject.delete({ where: { id } })
  return { id, deleted: true }
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

export async function updateChapter(id: string, data: { name?: string; chapterNo?: number }) {
  const chapter = await prisma.chapter.findUnique({ where: { id } })
  if (!chapter) throw Errors.notFound('Chapter')
  if (data.chapterNo !== undefined) {
    const clash = await prisma.chapter.findFirst({
      where: { subjectId: chapter.subjectId, chapterNo: data.chapterNo, id: { not: id } },
    })
    if (clash) throw Errors.conflict(`Chapter number ${data.chapterNo} already exists in this subject`)
  }
  return prisma.chapter.update({ where: { id }, data })
}

export async function deleteChapter(id: string) {
  const chapter = await prisma.chapter.findUnique({ where: { id } })
  if (!chapter) throw Errors.notFound('Chapter')
  const [concepts, batches] = await Promise.all([
    prisma.concept.count({ where: { chapterId: id } }),
    prisma.batch.count({ where: { chapterId: id } }),
  ])
  const blockers: string[] = []
  if (concepts > 0) blockers.push(`${concepts} concept(s)`)
  if (batches > 0) blockers.push(`${batches} batch(es)`)
  if (blockers.length > 0) {
    throw Errors.conflict(`Cannot delete chapter: it still has ${blockers.join(', ')}.`)
  }
  await prisma.chapter.delete({ where: { id } })
  return { id, deleted: true }
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

export async function deleteConcept(id: string) {
  const concept = await prisma.concept.findUnique({ where: { id } })
  if (!concept) throw Errors.notFound('Concept')
  const questionCount = await prisma.question.count({ where: { conceptId: id } })
  if (questionCount > 0) {
    throw Errors.conflict(`Cannot delete concept: it is referenced by ${questionCount} question(s).`)
  }
  await prisma.concept.delete({ where: { id } })
  return { id, deleted: true }
}

// ── Question Types ────────────────────────────────────────────────────────────

export async function listQuestionTypes() {
  return prisma.questionType.findMany({
    where: { isActive: true },
    orderBy: { code: 'asc' },
  })
}

export async function createQuestionType(code: string, label: string) {
  const existing = await prisma.questionType.findUnique({ where: { code } })
  if (existing) throw Errors.conflict(`Question type '${code}' already exists`)
  return prisma.questionType.create({ data: { code, label } })
}

export async function updateQuestionType(id: string, data: { label?: string; isActive?: boolean }) {
  const qt = await prisma.questionType.findUnique({ where: { id } })
  if (!qt) throw Errors.notFound('Question type')
  return prisma.questionType.update({ where: { id }, data })
}

export async function deleteQuestionType(id: string) {
  const qt = await prisma.questionType.findUnique({ where: { id } })
  if (!qt) throw Errors.notFound('Question type')
  const [batches, questions] = await Promise.all([
    prisma.batch.count({ where: { questionTypeId: id } }),
    prisma.question.count({ where: { questionTypeId: id } }),
  ])
  const blockers: string[] = []
  if (batches > 0) blockers.push(`${batches} batch(es)`)
  if (questions > 0) blockers.push(`${questions} question(s)`)
  if (blockers.length > 0) {
    throw Errors.conflict(`Cannot delete question type: it is used by ${blockers.join(', ')}.`)
  }
  await prisma.questionType.delete({ where: { id } })
  return { id, deleted: true }
}
