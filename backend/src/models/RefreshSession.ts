import mongoose, { Document, Schema, Types } from 'mongoose';

// Device info interface
export interface IDeviceInfo {
  userAgent?: string;
  ip?: string;
  platform?: string;
  browser?: string;
}

// Refresh session interface
export interface IRefreshSession extends Document {
  userId: Types.ObjectId;
  sessionId: string;           // Stable session identifier (jti)
  tokenHash: string;           // bcrypt hash of CURRENT refresh token
  deviceInfo: IDeviceInfo;
  issuedAt: Date;
  expiresAt: Date;
  lastUsedAt: Date;
  revoked: boolean;
  revokedAt?: Date;
  revokedReason?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  isExpired(): boolean;
  isValid(): boolean;
}

// Device info subdocument schema
const deviceInfoSchema = new Schema<IDeviceInfo>(
  {
    userAgent: String,
    ip: String,
    platform: String,
    browser: String,
  },
  { _id: false }
);

// Refresh session schema
const refreshSessionSchema = new Schema<IRefreshSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,  // unique creates the index
    },
    tokenHash: {
      type: String,
      required: true,
    },
    deviceInfo: {
      type: deviceInfoSchema,
      default: () => ({}),
    },
    issuedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    lastUsedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    revoked: {
      type: Boolean,
      default: false,
    },
    revokedAt: Date,
    revokedReason: String,
  },
  {
    timestamps: true,
  }
);

// Compound indexes
refreshSessionSchema.index({ userId: 1, revoked: 1 });
refreshSessionSchema.index({ userId: 1, sessionId: 1 });
refreshSessionSchema.index({ sessionId: 1, revoked: 1 });
refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Check if session is expired
refreshSessionSchema.methods.isExpired = function (): boolean {
  return new Date() > this.expiresAt;
};

// Check if session is valid (not expired and not revoked)
refreshSessionSchema.methods.isValid = function (): boolean {
  return !this.revoked && !this.isExpired();
};

// Export model
export const RefreshSession = mongoose.model<IRefreshSession>(
  'RefreshSession',
  refreshSessionSchema
);
