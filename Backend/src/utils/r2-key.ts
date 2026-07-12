export function buildDiagramKey(
  subjectCode: string,
  batchId: string,
  questionId: string,
  version: number,
): string {
  return `diagrams/${subjectCode}/${batchId}/${questionId}/v${version}.png`
}

export function buildExportKey(
  batchId: string,
  format: 'json' | 'excel' | 'pdf',
  filename: string,
): string {
  return `exports/${batchId}/${format}/${filename}`
}
