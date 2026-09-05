import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * OutboxEvent Model
 * Stores events for reliable async processing (outbox pattern).
 * Workers claim events via atomic lease (lockedBy / lockedUntil).
 */

export interface IOutboxEvent extends Document {
  aggregateType: string;       // 'Order', 'User', etc.
  aggregateId:   Types.ObjectId;
  eventType:     string;       // 'OrderCreated', 'OrderStatusChanged', etc.
  payload:       any;

  // Processing state
  processed:     boolean;
  processedAt?:  Date;

  // Atomic lease (worker concurrency)
  lockedBy?:     string;       // worker ID
  lockedUntil?:  Date;         // lease expiry

  // Retry tracking
  retryCount:    number;
  maxRetries:    number;
  lastError?:    string;

  createdAt:     Date;
  updatedAt:     Date;
}

const outboxEventSchema = new Schema<IOutboxEvent>(
  {
    aggregateType: { type: String, required: true },
    aggregateId:   { type: Schema.Types.ObjectId, required: true },
    eventType:     { type: String, required: true },
    payload:       { type: Schema.Types.Mixed, required: true },

    processed:     { type: Boolean, default: false },
    processedAt:   { type: Date },

    lockedBy:      { type: String },
    lockedUntil:   { type: Date },

    retryCount:    { type: Number, default: 0, min: 0 },
    maxRetries:    { type: Number, default: 5 },
    lastError:     { type: String },
  },
  { timestamps: true }
);

// Compound indexes — no duplicates
outboxEventSchema.index({ processed: 1, lockedBy: 1, lockedUntil: 1 }); // worker query
outboxEventSchema.index({ aggregateId: 1, eventType: 1 });
outboxEventSchema.index({ processed: 1, createdAt: 1 });

export const OutboxEvent = mongoose.model<IOutboxEvent>('OutboxEvent', outboxEventSchema);
