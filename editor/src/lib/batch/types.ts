/**
 * Batch processing types and constants for bulk video generation
 */

export type BatchStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'partial_failure'
  | 'failed';

export interface BatchProgress {
  batchId: string;
  total: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  percentComplete: number;
}

export interface FieldMapping {
  csvColumn: string;
  templateField: string;
  confidence: number;
}

export interface ValidationResult {
  rowIndex: number;
  valid: boolean;
  errors: string[];
  data: Record<string, unknown>;
}

/**
 * Tier-based batch size limits
 * Prevents resource exhaustion and enforces fair usage
 */
export const BATCH_SIZE_LIMITS = {
  free: 10,
  pro: 100,
  enterprise: 1000,
} as const;

/**
 * BullMQ addBulk chunk size
 * Prevents Redis "max command size" errors on large batches
 */
export const BULK_CHUNK_SIZE = 100;
