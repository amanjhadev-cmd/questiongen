export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const Errors = {
  unauthorized: (msg = 'Unauthorized') => new AppError(msg, 401, 'UNAUTHORIZED'),
  forbidden: (msg = 'Forbidden') => new AppError(msg, 403, 'FORBIDDEN'),
  notFound: (resource: string) => new AppError(`${resource} not found`, 404, 'NOT_FOUND'),
  validation: (msg: string, details?: unknown) => new AppError(msg, 422, 'VALIDATION_ERROR', details),
  conflict: (msg: string) => new AppError(msg, 409, 'CONFLICT'),
  internal: (msg = 'Internal server error') => new AppError(msg, 500, 'INTERNAL_ERROR'),
}
