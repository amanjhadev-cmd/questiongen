export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export function getPaginationParams(query: { page?: string; limit?: string }): PaginationParams {
  const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10) || 20))
  return { page, limit }
}

export function buildMeta(total: number, { page, limit }: PaginationParams): PaginatedMeta {
  return { total, page, limit, totalPages: Math.ceil(total / limit) }
}

export function getSkip({ page, limit }: PaginationParams): number {
  return (page - 1) * limit
}
