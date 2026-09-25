/**
 * Standardized Frontend API Client
 * Seamlessly interfaces with Next.js 15 Backend API routes
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
    details?: unknown;
  };
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  fields?: Record<string, string[]>;

  constructor(code: string, message: string, status: number, details?: unknown, fields?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.fields = fields;
  }
}

export async function fetchApi<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Automatically passes auth cookies
  });

  // Handle file downloads (e.g. Excel monthly export)
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('spreadsheet') || contentType.includes('octet-stream')) {
    const blob = await res.blob();
    return blob as unknown as T;
  }

  const json: ApiResponse<T> = await res.json().catch(() => ({
    success: false,
    data: null as unknown as T,
    error: {
      code: 'INVALID_RESPONSE',
      message: `Server returned HTTP ${res.status}`,
    },
  }));

  if (!res.ok || !json.success) {
    let message = json.error?.message || 'Something went wrong';
    if (json.error?.fields) {
      const fieldList = Object.entries(json.error.fields)
        .map(([field, msgs]) => `${field.replace(/_/g, ' ')}: ${msgs.join(', ')}`)
        .join('; ');
      if (fieldList) {
        message = `${message} (${fieldList})`;
      }
    }

    throw new ApiError(
      json.error?.code || 'ERROR',
      message,
      res.status,
      json.error?.details,
      json.error?.fields
    );
  }

  // Handle paginated responses where data was an array but pagination was at root
  if (json.pagination && Array.isArray(json.data)) {
    return {
      items: json.data,
      pagination: json.pagination,
    } as unknown as T;
  }

  return json.data;
}

/**
 * Format number as Bangladeshi Taka (৳ 1,500)
 */
export function formatBDT(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '৳ 0';
  }
  const num = Math.round(Number(amount));
  return `৳ ${num.toLocaleString('en-IN')}`;
}

/**
 * Format ISO date string into readable format (e.g. 25 Sep 2026)
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Format status text for badges
 */
export function formatStatus(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
