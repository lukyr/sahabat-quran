/**
 * Centralized Error Handling Utilities
 * Provides consistent error classification and user-friendly messages
 */

import { ERROR_MESSAGES } from '../constants';

export enum ErrorType {
  NETWORK = 'NETWORK',
  API = 'API',
  VALIDATION = 'VALIDATION',
  RATE_LIMIT = 'RATE_LIMIT',
  FORBIDDEN = 'FORBIDDEN',
  UNKNOWN = 'UNKNOWN',
}

export class AppError extends Error {
  constructor(
    message: string,
    public type: ErrorType,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Classifies error and returns user-friendly message
 */
export function handleError(error: unknown): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new AppError(ERROR_MESSAGES.NETWORK_ERROR, ErrorType.NETWORK, error as Error);
  }

  // Forbidden errors (403)
  if (error instanceof Error && (
    error.message.includes('403') ||
    error.message.includes('Forbidden') ||
    error.message.includes('permission')
  )) {
    return new AppError(
      'API key tidak valid atau tidak memiliki akses. Periksa API key Anda di .env.local',
      ErrorType.FORBIDDEN,
      error
    );
  }

  // Quota exceeded errors
  if (error instanceof Error && (
    error.message.includes('QUOTA_EXCEEDED') ||
    error.message.includes('quota') ||
    error.message.includes('exceeded your current quota')
  )) {
    return new AppError(ERROR_MESSAGES.QUOTA_EXCEEDED, ErrorType.RATE_LIMIT, error);
  }

  // Rate limit errors
  if (error instanceof Error && (
    error.message.includes('429') ||
    error.message.includes('rate limit') ||
    error.message.includes('RATE_LIMIT')
  )) {
    return new AppError(ERROR_MESSAGES.RATE_LIMIT, ErrorType.RATE_LIMIT, error);
  }

  // Validation errors
  if (error instanceof Error && (
    error.message.includes('tidak valid') ||
    error.message.includes('invalid')
  )) {
    return new AppError(error.message, ErrorType.VALIDATION, error);
  }

  // API errors
  if (error instanceof Error && error.message.includes('API')) {
    return new AppError(ERROR_MESSAGES.API_ERROR, ErrorType.API, error);
  }

  // Unknown errors
  const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
  return new AppError(message, ErrorType.UNKNOWN, error as Error);
}

/**
 * Determines if an error should trigger a retry
 */
export function shouldRetry(error: AppError, retryCount: number, maxRetries: number): boolean {
  if (retryCount >= maxRetries) {
    return false;
  }

  // Retry on network errors and rate limits
  return error.type === ErrorType.NETWORK || error.type === ErrorType.RATE_LIMIT;
}

/**
 * Logs error to console (can be extended to send to monitoring service)
 */
export function logError(error: AppError, context?: Record<string, any>): void {
  console.error('[AppError]', {
    type: error.type,
    message: error.message,
    originalError: error.originalError,
    context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Creates a timeout promise for fetch requests
 */
export function createTimeoutPromise(timeoutMs: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new AppError(ERROR_MESSAGES.NETWORK_ERROR, ErrorType.NETWORK));
    }, timeoutMs);
  });
}
