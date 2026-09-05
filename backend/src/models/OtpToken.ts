import mongoose, { Document, Schema, Types } from 'mongoose';

export enum OtpPurpose {
  PHONE_VERIFY  = 'phone_verify',
  PASSWORD_RESET = 'password_reset',
}

export interface IOtpToken extends Document {
  userId:    Types.ObjectId;
  phone:     string;
  code:      string;       // 6-digit hashed OTP
  purpose:   OtpPurpose;
  expiresAt: Date;
  used:      boolean;
  attempts:  number;       // wrong-code attempts (max 5)
  createdAt: Date;
}

const otpTokenSchema = new Schema<IOtpToken>(
  {
    userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    phone:     { type: String, required: true },
    code:      { type: String, required: true },           // bcrypt hash
    purpose:   { type: String, enum: Object.values(OtpPurpose), required: true },
    expiresAt: { type: Date,   required: true },
    used:      { type: Boolean, default: false },
    attempts:  { type: Number,  default: 0, max: 5 },
  },
  { timestamps: true }
);

// TTL — MongoDB auto-removes expired tokens
otpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpTokenSchema.index({ userId: 1, purpose: 1 });

export const OtpToken = mongoose.model<IOtpToken>('OtpToken', otpTokenSchema);
