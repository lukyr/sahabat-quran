/**
 * Input Validation Utilities
 * Provides type-safe validation for user inputs and API parameters
 */

import { QURAN_CONFIG, ERROR_MESSAGES } from '../constants';

/**
 * Validates if a surah number is within valid range (1-114)
 */
export function isValidSurahNumber(surah: number): boolean {
  return Number.isInteger(surah) && surah >= 1 && surah <= QURAN_CONFIG.TOTAL_SURAHS;
}

/**
 * Validates if an ayah number is positive integer
 * Note: Maximum ayah number varies by surah, should be validated against API
 */
export function isValidAyahNumber(ayah: number): boolean {
  return Number.isInteger(ayah) && ayah >= 1;
}

/**
 * Validates surah number and throws error if invalid
 */
export function validateSurahNumber(surah: number): void {
  if (!isValidSurahNumber(surah)) {
    throw new Error(ERROR_MESSAGES.INVALID_SURAH);
  }
}

/**
 * Validates ayah number and throws error if invalid
 */
export function validateAyahNumber(ayah: number): void {
  if (!isValidAyahNumber(ayah)) {
    throw new Error(ERROR_MESSAGES.INVALID_AYAH);
  }
}

/**
 * Sanitizes user input string to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 500); // Limit length
}

/**
 * Type guard to check if value is a valid language
 */
export function isValidLanguage(lang: string): lang is typeof QURAN_CONFIG.SUPPORTED_LANGUAGES[number] {
  return QURAN_CONFIG.SUPPORTED_LANGUAGES.includes(lang as any);
}

/**
 * Validates and sanitizes search query
 */
export function validateSearchQuery(query: string): string {
  const sanitized = sanitizeInput(query);
  if (sanitized.length < 2) {
    throw new Error('Query terlalu pendek. Minimal 2 karakter.');
  }
  return sanitized;
}

/**
 * Validates page number for pagination
 */
export function validatePageNumber(page: number): void {
  if (!Number.isInteger(page) || page < 1) {
    throw new Error('Nomor halaman tidak valid.');
  }
}
