export interface User {
  id: string
  email: string
  name: string
  role: 'super_admin' | 'admin' | 'sme' | 'intern'
  isActive: boolean
  createdAt: string
  subjects?: Array<Pick<Subject, 'id' | 'name' | 'code'>>
}

export interface Board { id: string; name: string }
export interface Class { id: string; boardId: string; name: string; board: Board }
export interface Subject { id: string; classId: string; name: string; code: string; class: Class }
export interface Chapter { id: string; subjectId: string; name: string; chapterNo: number; uuid?: string | null }
export interface Concept { id: string; chapterId: string; name: string; uuid: string; shortNote?: string }
export interface QuestionType { id: string; code: string; label: string }

export interface PromptVersion {
  id: string
  promptId: string
  versionNo: number
  content: string
  templateText?: string
  variables: string[]
  status: 'draft' | 'published' | 'archived'
  notes?: string
  createdAt: string
}

export interface Prompt {
  id: string
  name: string
  subjectId?: string
  subject?: Pick<Subject, 'id' | 'name' | 'code'>
  description?: string
  isActive: boolean
  isArchived?: boolean
  versions: PromptVersion[]
  createdAt: string
}

export interface SubjectProfile {
  id: string
  subjectId: string
  subject: Pick<Subject, 'id' | 'name' | 'code'>
  promptVersionId: string
  promptVersion: Pick<PromptVersion, 'id' | 'versionNo' | 'status'>
  schemaVersionId: string
  maxConcepts: number
  generationProvider: string
  diagramEnabled: boolean
  passageEnabled: boolean
  conceptEnabled: boolean
  solutionStepsEnabled: boolean
  fieldRegistryJson: unknown
  updatedAt: string
}

export type BatchStatus =
  | 'created'
  | 'generation_complete'
  | 'import_complete'
  | 'validation_complete'
  | 'diagram_complete'
  | 'sme_review_complete'
  | 'export_complete'
  | 'synced'

export interface Batch {
  id: string
  name: string
  subjectId: string
  subject: Pick<Subject, 'id' | 'name' | 'code'>
  chapterId?: string
  chapter?: Pick<Chapter, 'id' | 'name' | 'chapterNo'>
  questionTypeId: string
  questionType: Pick<QuestionType, 'id' | 'code' | 'label'>
  difficulty: 'easy' | 'medium' | 'hard'
  questionCount: number
  status: BatchStatus
  notes?: string
  createdById: string
  createdBy: Pick<User, 'id' | 'name' | 'email'>
  assignee?: Pick<User, 'id' | 'name' | 'email'>
  createdAt: string
  updatedAt: string
  _count?: { questions: number }
}

export type QuestionStatus =
  | 'staged'
  | 'validation_failed'
  | 'validated'
  | 'diagram_pending'
  | 'diagram_done'
  | 'under_review'
  | 'approved'
  | 'rejected'

export interface Question {
  id: string
  batchId: string
  conceptId?: string
  concept?: Pick<Concept, 'id' | 'name' | 'uuid'>
  questionTypeId: string
  questionType: Pick<QuestionType, 'id' | 'code' | 'label'>
  content: QuestionContent
  injectedMetadata: Record<string, unknown>
  status: QuestionStatus
  version: number
  importErrors: Array<{ pass: number; field: string; message: string }>
  createdAt: string
  updatedAt: string
}

export interface QuestionContent {
  question_text: string
  question_type: string
  marks: number
  difficulty: string
  bloom_level: string
  explanation: string
  options?: Array<{ key: string; text: string }>
  correct_option?: string
  correct_answer?: boolean
  blanks?: Array<{ position: number; answer: string; alternatives?: string[] }>
  column_a?: object[]
  column_b?: object[]
  correct_matches?: Record<string, string>
  solution_steps?: Array<{ step_no: number; content: string }>
  passage?: string
  hint?: string
  tags?: string[]
  diagram_required?: boolean
  diagram_description?: string
  language?: string
  is_ncert?: boolean
  ncert_page?: number
  concept_uuids?: string[]
}

export interface DiagramJob {
  id: string
  questionId: string
  description: string
  status: 'pending' | 'uploaded' | 'failed'
  errorMessage?: string
  assets: DiagramAsset[]
  createdAt: string
}

export interface DiagramAsset {
  id: string
  diagramJobId: string
  r2Key: string
  publicUrl: string
  version: number
  isActive: boolean
  createdAt: string
}

export interface SmeReview {
  id: string
  questionId: string
  reviewedById: string
  reviewedBy: Pick<User, 'id' | 'name'>
  decision: 'approved' | 'rejected'
  notes?: string
  createdAt: string
}

export interface Export {
  id: string
  name: string
  batchId: string
  format: 'json' | 'excel' | 'pdf'
  r2Key?: string
  publicUrl?: string
  status: 'pending' | 'processing' | 'done' | 'failed'
  createdAt: string
}

export interface PromptPreview {
  batchId: string
  batchName: string
  promptVersionId: string
  promptVersionNo: number
  interpolatedPrompt: string
  concepts: Array<{ uuid: string; name: string; shortNote?: string }>
  featureFlags: {
    diagramEnabled: boolean
    conceptEnabled: boolean
    passageEnabled: boolean
    solutionStepsEnabled: boolean
    maxConcepts: number
  }
  dedup?: {
    existingCount: number
    conceptCoverage: Array<{ uuid: string; name: string; count: number }>
    avoidSampleCount: number
  }
}

export interface PaginatedMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginatedMeta
}
