import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // ── Super Admin ──────────────────────────────────────────────────────────────
  const superAdminHash = await bcrypt.hash('Admin@123', 12)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@questiongen.com' },
    update: {},
    create: {
      email: 'superadmin@questiongen.com',
      name: 'Super Admin',
      passwordHash: superAdminHash,
      role: 'super_admin',
    },
  })
  console.log('Created:', superAdmin.email)

  // ── Board ─────────────────────────────────────────────────────────────────────
  const cbse = await prisma.board.upsert({
    where: { name: 'CBSE' },
    update: {},
    create: { name: 'CBSE' },
  })

  // ── Class ─────────────────────────────────────────────────────────────────────
  const class10 = await prisma.class.upsert({
    where: { boardId_name: { boardId: cbse.id, name: 'Class 10' } },
    update: {},
    create: { boardId: cbse.id, name: 'Class 10' },
  })

  // ── Subjects ──────────────────────────────────────────────────────────────────
  const science = await prisma.subject.upsert({
    where: { classId_code: { classId: class10.id, code: 'SCI10' } },
    update: {},
    create: { classId: class10.id, name: 'Science', code: 'SCI10' },
  })

  const maths = await prisma.subject.upsert({
    where: { classId_code: { classId: class10.id, code: 'MATH10' } },
    update: {},
    create: { classId: class10.id, name: 'Mathematics', code: 'MATH10' },
  })

  const english = await prisma.subject.upsert({
    where: { classId_code: { classId: class10.id, code: 'ENG10' } },
    update: {},
    create: { classId: class10.id, name: 'English', code: 'ENG10' },
  })

  // ── Chapters ──────────────────────────────────────────────────────────────────
  const chapter1 = await prisma.chapter.upsert({
    where: { subjectId_chapterNo: { subjectId: science.id, chapterNo: 1 } },
    update: {},
    create: {
      subjectId: science.id,
      name: 'Chemical Reactions and Equations',
      chapterNo: 1,
    },
  })

  // ── Concepts (with short_note) ────────────────────────────────────────────────
  const concepts = [
    {
      uuid: 'SCI-1042-CH3A',
      name: 'Combination Reaction',
      shortNote: 'Two or more substances combine to form a single new substance. E.g. 2H₂ + O₂ → 2H₂O',
    },
    {
      uuid: 'SCI-1042-CH3B',
      name: 'Decomposition Reaction',
      shortNote: 'A single compound breaks into two or more simpler substances when heated, exposed to light, or electrolysis.',
    },
    {
      uuid: 'SCI-1042-CH3C',
      name: 'Redox Reaction',
      shortNote: 'Simultaneous oxidation and reduction. One species loses electrons (oxidised), the other gains electrons (reduced).',
    },
  ]

  for (const c of concepts) {
    await prisma.concept.upsert({
      where: { uuid: c.uuid },
      update: { shortNote: c.shortNote },
      create: { chapterId: chapter1.id, name: c.name, uuid: c.uuid, shortNote: c.shortNote },
    })
  }

  // ── Question Types ────────────────────────────────────────────────────────────
  for (const qt of [
    { code: 'MCQ', label: 'Multiple Choice Question' },
    { code: 'FIB', label: 'Fill in the Blank' },
    { code: 'TF', label: 'True or False' },
    { code: 'MATCH', label: 'Match the Following' },
    { code: 'SHORT', label: 'Short Answer' },
    { code: 'LONG', label: 'Long Answer' },
  ]) {
    await prisma.questionType.upsert({
      where: { code: qt.code },
      update: {},
      create: qt,
    })
  }

  // ── Schema ────────────────────────────────────────────────────────────────────
  const schema = await prisma.schema.create({
    data: { name: 'Question Schema' },
  })

  await prisma.schemaVersion.create({
    data: {
      schemaId: schema.id,
      versionNo: 2,
      definition: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        title: 'QuestionSchema',
        version: 2,
        type: 'object',
        required: ['question_text', 'question_type', 'marks', 'difficulty', 'bloom_level', 'explanation'],
      },
      createdById: superAdmin.id,
    },
  })

  // ── Prompt ────────────────────────────────────────────────────────────────────
  const sciencePrompt = await prisma.prompt.create({
    data: {
      name: 'Science MCQ',
      subjectId: science.id,
      description: 'Standard MCQ prompt for Science subjects with concept mapping and diagram support',
      createdById: superAdmin.id,
    },
  })

  await prisma.promptVersion.create({
    data: {
      promptId: sciencePrompt.id,
      versionNo: 6,
      status: 'published',
      content: `You are an expert {{subject}} teacher for {{board}} {{class}}.

Generate {{count}} {{question_type}} questions on the chapter "{{chapter}}".

Focus on these concepts (provided below — include their UUIDs in concept_uuids field).

Rules:
- Each question must have exactly 4 options (A, B, C, D)
- Mark one correct answer
- Include a detailed explanation (minimum 2 sentences)
- Difficulty: {{difficulty}}
- Bloom's taxonomy level: {{bloom_level}}
- Maximum {{max_concepts}} concept UUIDs per question
- If a diagram is needed, set diagram_required: true and write diagram_description
- Return ONLY valid JSON array. No markdown. No preamble.

JSON Schema:
{{schema}}`,
      variables: ['subject', 'board', 'class', 'count', 'question_type', 'chapter', 'difficulty', 'bloom_level', 'max_concepts', 'schema'],
      notes: 'Production prompt for Science MCQ with concept mapping enabled',
      createdById: superAdmin.id,
    },
  })

  console.log('Seed complete.')
  console.log('Login: superadmin@questiongen.com / Admin@123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
