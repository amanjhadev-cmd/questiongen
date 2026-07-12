import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Super Admin
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
  console.log('Super Admin:', superAdmin.email)

  // Board
  const cbse = await prisma.board.upsert({
    where: { name: 'CBSE' },
    update: {},
    create: { name: 'CBSE' },
  })

  // Class 10
  const class10 = await prisma.class.upsert({
    where: { boardId_name: { boardId: cbse.id, name: 'Class 10' } },
    update: {},
    create: { boardId: cbse.id, name: 'Class 10' },
  })

  // Science subject
  const science = await prisma.subject.upsert({
    where: { classId_code: { classId: class10.id, code: 'SCI10' } },
    update: {},
    create: { classId: class10.id, name: 'Science', code: 'SCI10' },
  })

  // Chapter
  const chapter1 = await prisma.chapter.upsert({
    where: { subjectId_chapterNo: { subjectId: science.id, chapterNo: 1 } },
    update: {},
    create: { subjectId: science.id, name: 'Chemical Reactions and Equations', chapterNo: 1 },
  })

  // Concept
  await prisma.concept.upsert({
    where: { uuid: 'SCI-1042-CH3A' },
    update: {},
    create: {
      chapterId: chapter1.id,
      name: 'Redox Reactions',
      uuid: 'SCI-1042-CH3A',
    },
  })

  // Question Types
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

  // Schema
  const schema = await prisma.schema.upsert({
    where: { id: schema?.id ?? '' },
    update: {},
    create: { name: 'Question Schema' },
  })

  await prisma.schemaVersion.create({
    data: {
      schemaId: schema.id,
      versionNo: 1,
      definition: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        required: ['question_text', 'question_type', 'marks', 'difficulty', 'bloom_level', 'concept_uuid', 'explanation'],
      },
      createdById: superAdmin.id,
    },
  })

  console.log('Seed complete.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
