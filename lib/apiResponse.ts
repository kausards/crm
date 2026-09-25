import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'BAD_REQUEST'
  | 'INTERNAL_ERROR';

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function paginatedResponse<T>(data: T[], pagination: { total: number; page: number; limit: number; totalPages: number }, status = 200) {
  return NextResponse.json({ success: true, data, pagination }, { status });
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  status = 400,
  fields?: Record<string, string[]>
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(fields ? { fields } : {}),
      },
    },
    { status }
  );
}

export function handleApiError(err: unknown) {
  if (err instanceof ZodError) {
    const fields: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const path = issue.path.join('.') || 'body';
      if (!fields[path]) fields[path] = [];
      fields[path].push(issue.message);
    }
    return errorResponse('VALIDATION_ERROR', 'Validation failed', 400, fields);
  }

  const message = err instanceof Error ? err.message : 'Internal Server Error';
  console.error('API Error:', err);

  return errorResponse('INTERNAL_ERROR', message, 500);
}
