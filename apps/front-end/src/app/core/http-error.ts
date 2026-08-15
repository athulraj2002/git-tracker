import type { HttpErrorResponse } from '@angular/common/http';

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (!isHttpErrorResponse(error)) {
    return fallback;
  }

  const message = error.error?.message;
  if (Array.isArray(message)) {
    return message
      .map((issue) => (typeof issue === 'string' ? issue : issue.message))
      .join(' ');
  }
  if (typeof message === 'string') {
    return message;
  }
  return fallback;
}

function isHttpErrorResponse(error: unknown): error is HttpErrorResponse {
  return !!error && typeof error === 'object' && 'error' in error;
}
