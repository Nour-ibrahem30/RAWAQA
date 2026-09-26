/**
 * Upload Middleware
 * Supports two storage backends selected by CLOUDINARY_ENABLED env flag:
 *   - Cloudinary (production): images stored in Cloudinary, permanent URLs
 *   - Local disk (development): images stored in uploads/products/, served statically
 *
 * The controller interface is identical either way — it receives req.files
 * with a `cloudinaryUrl` property added when Cloudinary is active.
 */

import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { logInfo, logError } from '../config/logger';
import { isCloudflareWorker } from '../lib/worker-runtime';

// ─── Cloudinary setup ─────────────────────────────────────────────────────────
let cloudinaryConfigured = false;
let cloudinaryV2: typeof import('cloudinary').v2 | null = null;

if (env.CLOUDINARY_ENABLED && env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  try {
    const { v2 } = require('cloudinary') as typeof import('cloudinary');
    v2.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key:    env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure:     true,
    });
    cloudinaryV2 = v2;
    cloudinaryConfigured = true;
    logInfo('Cloudinary upload storage configured');
  } catch (err) {
    logError('Failed to configure Cloudinary — falling back to local disk', err);
  }
} else if (env.CLOUDINARY_ENABLED) {
  logError('CLOUDINARY_ENABLED=true but credentials missing — falling back to local disk', new Error('Missing Cloudinary credentials'));
}

// ─── Local disk setup ─────────────────────────────────────────────────────────
const uploadDir = path.resolve(env.UPLOAD_DESTINATION || 'uploads/products');
// Local-disk directory bootstrap is Node-only. Cloudflare Workers have no
// writable filesystem, and this runs at module scope — calling fs.mkdirSync there
// crashes the Worker on boot ("operation not permitted"). Skip it on the Worker
// only; Node/Render behavior is unchanged (same existsSync/mkdirSync as before).
// Note: local-disk uploads themselves are not Worker-ready until the deferred R2
// phase — this guard only lets the module load so the HTTP API can boot.
if (!isCloudflareWorker() && !cloudinaryConfigured) {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

// ─── File type filter ─────────────────────────────────────────────────────────
const allowedMimes = (env.UPLOAD_ALLOWED_TYPES || 'image/jpeg,image/png,image/webp')
  .split(',')
  .map((t) => t.trim());

// =============================================================================
// MAGIC BYTE SIGNATURES — actual file content validation
// =============================================================================
// SECURITY: MIME types are attacker-controlled. We must verify the actual file
// content by checking magic bytes (file signatures). This prevents attackers
// from uploading malicious files disguised as images.
// =============================================================================
const MAGIC_SIGNATURES: Record<string, { bytes: number[]; offset?: number }[]> = {
  'image/jpeg': [
    { bytes: [0xFF, 0xD8, 0xFF] }, // JPEG/JFIF
  ],
  'image/png': [
    { bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }, // PNG
  ],
  'image/webp': [
    { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF header
    // WebP also has WEBP at offset 8, but RIFF at 0 is sufficient for basic check
  ],
  'image/gif': [
    { bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
    { bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // GIF89a
  ],
};

/**
 * Validates that the file buffer matches the expected magic bytes for its MIME type.
 * Returns true if the file content matches, false otherwise.
 */
const validateMagicBytes = (buffer: Buffer, mimetype: string): boolean => {
  const signatures = MAGIC_SIGNATURES[mimetype];
  if (!signatures) {
    // No signature defined for this type — fall back to MIME check only
    // (this is less secure but maintains backward compatibility for edge cases)
    return true;
  }

  for (const sig of signatures) {
    const offset = sig.offset ?? 0;
    if (buffer.length < offset + sig.bytes.length) continue;

    let matches = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buffer[offset + i] !== sig.bytes[i]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }

  return false;
};

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed: ${allowedMimes.join(', ')}`));
  }
};

// ─── Storage strategy ────────────────────────────────────────────────────────
// When Cloudinary is active we use memory storage, then upload the buffer
// in the controller via uploadToCloudinary(). This avoids writing temp files.
const storage = cloudinaryConfigured
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, uploadDir),
      filename:    (_req, file, cb) => {
        const ext  = path.extname(file.originalname).toLowerCase();
        const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
        cb(null, name);
      },
    });

// ─── Multer instance ──────────────────────────────────────────────────────────
export const upload = multer({
  storage,
  limits:     { fileSize: env.UPLOAD_MAX_FILE_SIZE || 15 * 1024 * 1024 },
  fileFilter,
});

// ─── Cloudinary upload helper ─────────────────────────────────────────────────
export interface UploadResult {
  url:      string;
  publicId: string;
  width?:   number;
  height?:  number;
  format?:  string;
  bytes?:   number;
}

/**
 * Upload a single file buffer to Cloudinary.
 * Returns the secure URL and public_id (needed for deletion).
 * SECURITY: Validates magic bytes before upload to prevent malicious file uploads.
 */
export const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder?: string
): Promise<UploadResult> => {
  if (!cloudinaryConfigured || !cloudinaryV2) {
    throw new Error('Cloudinary is not configured');
  }

  // SECURITY: Validate magic bytes before uploading
  if (!validateMagicBytes(file.buffer, file.mimetype)) {
    throw new Error(`Invalid file content: file does not match declared type ${file.mimetype}`);
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinaryV2!.uploader.upload_stream(
      {
        folder:         folder || env.CLOUDINARY_FOLDER,
        resource_type:  'image',
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
          { width: 1200, height: 1200, crop: 'limit' },
        ],
      },
      (err, result) => {
        if (err || !result) return reject(err || new Error('Cloudinary upload failed'));
        resolve({
          url:     result.secure_url,
          publicId: result.public_id,
          width:   result.width,
          height:  result.height,
          format:  result.format,
          bytes:   result.bytes,
        });
      }
    );
    stream.end(file.buffer);
  });
};

/**
 * Delete an image from Cloudinary by its public_id.
 * Safe to call even if Cloudinary is disabled (no-op).
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  if (!cloudinaryConfigured || !cloudinaryV2 || !publicId) return;
  try {
    await cloudinaryV2.uploader.destroy(publicId);
    logInfo(`Cloudinary: deleted asset ${publicId}`);
  } catch (err) {
    logError(`Cloudinary: failed to delete asset ${publicId}`, err);
  }
};

/** Whether Cloudinary storage is active */
export const isCloudinaryEnabled = (): boolean => cloudinaryConfigured;

// ─── Local file helpers (used when Cloudinary is off) ────────────────────────

/** Build public URL for a local uploaded file */
export const buildFileUrl = (req: Request, filename: string): string => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/uploads/products/${filename}`;
};

/** Delete a local file (cleanup on product delete / image replace) */
export const deleteLocalFile = (filename: string): void => {
  const filePath = path.join(uploadDir, filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      logError(`Failed to delete local file ${filename}`, err);
    }
  }
};

// ─── Multer error handler ─────────────────────────────────────────────────────
export const handleMulterError = (
  err: any,
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        res.status(400).json({
          success: false,
          message: `File too large. Maximum size is ${Math.round((env.UPLOAD_MAX_FILE_SIZE || 15728640) / 1024 / 1024)} MB`,
        });
        return;
      case 'LIMIT_FILE_COUNT':
        res.status(400).json({ success: false, message: 'Too many files. Maximum 10 images per upload' });
        return;
      case 'LIMIT_UNEXPECTED_FILE':
        res.status(400).json({ success: false, message: 'Unexpected field name. Use "images" as the field name' });
        return;
      default:
        res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
        return;
    }
  }

  if (err instanceof Error && err.message.includes('File type not allowed')) {
    res.status(400).json({ success: false, message: err.message });
    return;
  }

  next(err);
};
