'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { CheckCircle, XCircle, Play, Save } from 'lucide-react'

interface TypeSchema {
  questionTypeId: string
  code: string
  label: string
  activeVersion: { id: string; versionNo: number; definition: unknown; createdAt: string } | null
}

interface TestResult {
  valid: boolean
  errors: Array<{ field: string; message: string }>
}

const STARTER = `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "additionalProperties": false,
  "required": ["question_text", "question_type", "marks", "difficulty", "bloom_level", "explanation"],
  "properties": {
    "question_text": { "type": "string", "minLength": 10 },
    "question_type": { "type": "string" },
    "marks": { "type": "number", "minimum": 1, "maximum": 10 },
    "difficulty": { "type": "string", "enum": ["easy", "medium", "hard"] },
    "bloom_level": { "type": "string", "enum": ["remember", "understand", "apply", "analyze", "evaluate", "create"] },
    "explanation": { "type": "string", "minLength": 20 }
  }
}`

export default function OutputSchemasPage() {
  const [types, setTypes] = useState<TypeSchema[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [schemaText, setSchemaText] = useState('')
  const [sampleText, setSampleText] = useState('')
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function loadTypes() {
    const data = await api.get<TypeSchema[]>('/question-type-schemas')
    setTypes(data)
    return data
  }

  useEffect(() => { loadTypes().catch(console.error) }, [])

  const selected = types.find((t) => t.questionTypeId === selectedId)

  function selectType(id: string) {
    setSelectedId(id)
    setTestResult(null)
    setMessage('')
    setError('')
    const t = types.find((x) => x.questionTypeId === id)
    setSchemaText(t?.activeVersion ? JSON.stringify(t.activeVersion.definition, null, 2) : '')
  }

  function parseOr(text: string, label: string): unknown {
    if (!text.trim()) throw new Error(`${label} is empty`)
    try { return JSON.parse(text) } catch { throw new Error(`${label} is not valid JSON`) }
  }

  async function runTest() {
    setError('')
    setMessage('')
    setTestResult(null)
    let definition: unknown, sample: unknown
    try {
      definition = parseOr(schemaText, 'Schema')
      sample = parseOr(sampleText, 'Sample question')
    } catch (e) { setError(e instanceof Error ? e.message : 'Invalid JSON'); return }
    setTesting(true)
    try {
      const res = await api.post<TestResult>('/question-type-schemas/test', { definition, sample })
      setTestResult(res)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Test failed') }
    setTesting(false)
  }

  async function save() {
    if (!selectedId) return
    setError('')
    setMessage('')
    let definition: unknown
    try { definition = parseOr(schemaText, 'Schema') } catch (e) { setError(e instanceof Error ? e.message : 'Invalid JSON'); return }
    setSaving(true)
    try {
      await api.post(`/question-type-schemas/${selectedId}/versions`, { definition })
      await loadTypes()
      setMessage('Saved as a new version.')
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Save failed') }
    setSaving(false)
  }

  return (
    <div className="p-8 space-y-6">
      <div className="page-header">
        <div>
          <h1>Output Schemas</h1>
          <p className="text-sm text-gray-500 mt-1">A strict JSON Schema per question type — drives import validation and the exported JSON shape.</p>
        </div>
      </div>

      {/* Type picker */}
      <div className="flex items-end gap-4 flex-wrap">
        <div>
          <label className="label">Question Type</label>
          <select className="input !w-72" value={selectedId} onChange={(e) => selectType(e.target.value)}>
            <option value="">Select a question type…</option>
            {types.map((t) => (
              <option key={t.questionTypeId} value={t.questionTypeId}>
                {t.code} — {t.label} {t.activeVersion ? `(v${t.activeVersion.versionNo})` : '(no schema yet)'}
              </option>
            ))}
          </select>
        </div>
        {selected && !schemaText && (
          <button onClick={() => setSchemaText(STARTER)} className="btn-secondary text-sm">Insert starter template</button>
        )}
      </div>

      {selected && (
        <div className="grid grid-cols-2 gap-6">
          {/* Schema editor */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Schema for {selected.code}</h2>
              <span className="text-xs text-gray-400">{selected.activeVersion ? `active v${selected.activeVersion.versionNo}` : 'not set'}</span>
            </div>
            <textarea
              className="input font-mono text-xs h-[28rem] resize-y"
              value={schemaText}
              onChange={(e) => setSchemaText(e.target.value)}
              placeholder="Paste a JSON Schema (draft-07)…"
              spellCheck={false}
            />
            <div className="flex gap-2">
              <button onClick={save} disabled={saving || !schemaText.trim()} className="btn-primary text-sm">
                <Save size={14} /> {saving ? 'Saving…' : 'Save as new version'}
              </button>
            </div>
            {message && <p className="text-green-600 text-sm">{message}</p>}
            {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
          </div>

          {/* Tester */}
          <div className="card p-5 space-y-3">
            <h2 className="text-base font-semibold">Test a sample question</h2>
            <p className="text-xs text-gray-500">Paste one question JSON and validate it against the schema on the left (before saving).</p>
            <textarea
              className="input font-mono text-xs h-72 resize-y"
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              placeholder={'{\n  "question_text": "…",\n  "question_type": "' + selected.code + '",\n  "marks": 1,\n  "difficulty": "medium",\n  "bloom_level": "understand",\n  "explanation": "…"\n}'}
              spellCheck={false}
            />
            <button onClick={runTest} disabled={testing} className="btn-secondary text-sm">
              <Play size={14} /> {testing ? 'Testing…' : 'Validate against schema'}
            </button>

            {testResult && (
              <div className={`rounded-lg p-3 text-sm ${testResult.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                {testResult.valid ? (
                  <p className="flex items-center gap-2 text-green-700 font-medium"><CheckCircle size={16} /> Valid — this question passes the schema.</p>
                ) : (
                  <>
                    <p className="flex items-center gap-2 text-red-700 font-medium mb-2"><XCircle size={16} /> {testResult.errors.length} error(s)</p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {testResult.errors.map((er, i) => (
                        <p key={i} className="text-xs text-red-700"><code>{er.field || 'root'}</code>: {er.message}</p>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!selected && (
        <div className="card p-8 text-center text-gray-400 text-sm">
          Pick a question type to view, edit, and test its output schema. Types come from Master Data → Question Types.
        </div>
      )}
    </div>
  )
}
