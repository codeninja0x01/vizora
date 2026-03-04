// Webhook type definitions for Vizora webhook system

// Supported webhook event types
export type WebhookEventType = 'render.completed' | 'render.failed';

// The actual data payload for webhook events
export interface WebhookPayloadData {
  type: WebhookEventType;
  renderId: string;
  templateId: string;
  status: 'done' | 'failed';
  outputUrl?: string;
  error?: {
    category: string;
    message: string;
  };
  completedAt?: string;
  failedAt?: string;
}

// The complete webhook payload sent to webhook URLs
export interface WebhookPayload {
  type: WebhookEventType;
  timestamp: string; // ISO 8601 format
  data: WebhookPayloadData;
}

// Job data structure for BullMQ webhook delivery queue
export interface WebhookJobData {
  webhookConfigId: string;
  renderId: string;
  webhookId: string; // Unique delivery ID with whk_ prefix
  payload: WebhookPayload;
}
