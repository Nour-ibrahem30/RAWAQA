/**
 * Upload Middleware — Multer with local disk storage
 * Structure: uploads/products/<filename>
 * Drop-in Cloudinary support: swap diskStorage for CloudinaryStorage later
 */

import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

// ─── Ensure upload directory exists ──────────────────────────────────────────
const uploadDir = path.resolve(env.UPLOAD_DESTINATION || 'uploads/products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ─── Storage: local disk ──────────────────────────────────────────────────────
const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext   = path.extname(file.originalname).toLowerCase();
    const name  = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

// ─── File type filter ─────────────────────────────────────────────────────────
const allowedMimes = (env.UPLOAD_ALLOWED_TYPES || 'image/jpeg,image/png,image/webp')
  .split(',')
  .map((t) => t.trim());

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed: ${allowedMimes.join(', ')}`));
  }
};

// ─── Multer instance ──────────────────────────────────────────────────────────
export const upload = multer({
  storage:  diskStorage,
  limits:   { fileSize: env.UPLOAD_MAX_FILE_SIZE || 5 * 1024 * 1024 },  // 5 MB default
  fileFilter,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build public URL for an uploaded file */
export const buildFileUrl = (req: Request, filename: string): string => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/uploads/products/${filename}`;
};

/** Delete a local file (cleanup on product delete / image replace) */
export const deleteLocalFile = (filename: string): void => {
  const filePath = path.join(uploadDir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

/**
 * Multer error handler middleware
 * Must be placed AFTER the multer middleware in the route chain
 * Usage: router.post('/', upload.array('images', 5), uploadHandler, handleMulterError)
 */
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
          message: `File too large. Maximum size is ${Math.round((env.UPLOAD_MAX_FILE_SIZE || 5242880) / 1024 / 1024)} MB`,
        });
        return;
      case 'LIMIT_FILE_COUNT':
        res.status(400).json({
          success: false,
          message: 'Too many files. Maximum 5 images per upload',
        });
        return;
      case 'LIMIT_UNEXPECTED_FILE':
        res.status(400).json({
          success: false,
          message: 'Unexpected field name. Use "images" as the field name',
        });
        return;
      default:
        res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`,
        });
        return;
    }
  }

  // File type error from fileFilter
  if (err instanceof Error && err.message.includes('File type not allowed')) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
    return;
  }

  next(err);
};
