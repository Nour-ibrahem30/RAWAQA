import mongoose, { Document, Schema, Types } from 'mongoose';
import { env } from '../config/env';

// Idempotency status
export enum IdempotencyStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// Idempotency key interface
export interface IIdempotencyKey extends Document {
  key: string;                    // Idempotency key from client
  userId?: Types.ObjectId;        // User who made the request
  requestHash: string;            // SHA-256 hash of request body
  status: IdempotencyStatus;
  processingTimeout: Date;        // Timeout for stuck processing
  result?: any;                   // Cached response
  error?: string;                 // Error message if failed
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  isProcessing(): boolean;
  isCompleted(): boolean;
  isFailed(): boolean;
  isStuck(): boolean;
}

// Idempotency key schema
const idempotencyKeySchema = new Schema<IIdempotencyKey>(
  {
    key: {
      type: String,
      required: true,
      unique: true,  // unique creates the index
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    requestHash: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(IdempotencyStatus),
      default: IdempotencyStatus.PROCESSING,
      required: true,
    },
    processingTimeout: {
      type: Date,
      required: true,
    },
    result: {
      type: Schema.Types.Mixed,
    },
    error: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
idempotencyKeySchema.index({ key: 1, userId: 1 });
idempotencyKeySchema.index({ status: 1, processingTimeout: 1 });

// TTL index - delete after 24 hours (configurable)
idempotencyKeySchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: env.IDEMPOTENCY_TTL_HOURS * 3600 }
);

// Check if processing
idempotencyKeySchema.methods.isProcessing = function (): boolean {
  return this.status === IdempotencyStatus.PROCESSING;
};

// Check if completed
idempotencyKeySchema.methods.isCompleted = function (): boolean {
  return this.status === IdempotencyStatus.COMPLETED;
};

// Check if failed
idempotencyKeySchema.methods.isFailed = function (): boolean {
  return this.status === IdempotencyStatus.FAILED;
};

// Check if stuck (processing but timeout passed)
idempotencyKeySchema.methods.isStuck = function (): boolean {
  return (
    this.status === IdempotencyStatus.PROCESSING &&
    new Date() > this.processingTimeout
  );
};

// Export model
export const IdempotencyKey = mongoose.model<IIdempotencyKey>(
  'IdempotencyKey',
  idempotencyKeySchema
);
