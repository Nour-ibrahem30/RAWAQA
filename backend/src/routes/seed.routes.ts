/**
 * ONE-TIME fix endpoint — fixes Cloudinary URLs in production DB
 * DELETE after running!
 * Usage: GET /api/seed?secret=rawaqa-seed-2026-temp
 */
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const router = Router();
const DEFAULT_SECRET = 'rawaqa-seed-2026-temp';

const CORRECT_IMAGES: Record<string, { url: string; publicId: string }[]> = {
  'RWQ-CHL-001': [
    { url: 'https://res.cloudinary.com/dr5welrvq/image/upload/v1788812671/rawaqa/products/chair-lounge-new/img-1.jpg', publicId: 'rawaqa/products/chair-lounge-new/img-1' },
    { url: 'https://res.cloudinary.com/dr5welrvq/image/upload/v1788812678/rawaqa/products/chair-lounge-new/img-2.jpg', publicId: 'rawaqa/products/chair-lounge-new/img-2' },
    { url: 'https://res.cloudinary.com/dr5welrvq/image/upload/v1788812688/rawaqa/products/chair-lounge-new/img-3.jpg', publicId: 'rawaqa/products/chair-lounge-new/img-3' },
  ],
  'RWQ-8B-001': [
    { url: 'https://res.cloudinary.com/dr5welrvq/image/upload/v1788812647/rawaqa/products/8ball-new/img-1.jpg', publicId: 'rawaqa/products/8ball-new/img-1' },
    { url: 'https://res.cloudinary.com/dr5welrvq/image/upload/v1788812651/rawaqa/products/8ball-new/img-2.jpg', publicId: 'rawaqa/products/8ball-new/img-2' },
    { url: 'https://res.cloudinary.com/dr5welrvq/image/upload/v1788812654/rawaqa/products/8ball-new/img-3.jpg', publicId: 'rawaqa/products/8ball-new/img-3' },
    { url: 'https://res.cloudinary.com/dr5welrvq/image/upload/v1788812658/rawaqa/products/8ball-new/img-4.jpg', publicId: 'rawaqa/products/8ball-new/img-4' },
  ],
  'RWQ-FB-L': [
    { url: 'https://res.cloudinary.com/dr5welrvq/image/upload/v1788812714/rawaqa/products/football-new/img-1.jpg', publicId: 'rawaqa/products/football-new/img-1' },
    { url: 'https://res.cloudinary.com/dr5welrvq/image/upload/v1788812751/rawaqa/products/football-new/img-2.jpg', publicId: 'rawaqa/products/football-new/img-2' },
    { url: 'https://res.cloudinary.com/dr5welrvq/image/upload/v1788812754/rawaqa/products/football-new/img-3.jpg', publicId: 'rawaqa/products/football-new/img-3' },
    { url: 'https://res.cloudinary.com/dr5welrvq/image/upload/v1788812758/rawaqa/products/football-new/img-4.jpg', publicId: 'rawaqa/products/football-new/img-4' },
    { url: 'https://res.cloudinary.com/dr5welrvq/image/upload/v1788812763/rawaqa/products/football-new/img-5.jpg', publicId: 'rawaqa/products/football-new/img-5' },
  ],
  'RWQ-FB-XL': [
    { url: 'https://res.cloudinary.com/dr5welrvq/image/upload/v1788812766/rawaqa/products/football-new/img-6.jpg', publicId: 'rawaqa/products/football-new/img-6' },
    { url: 'https://res.cloudinary.com/dr5welrvq/image/upload/v1788812770/rawaqa/products/football-new/img-7.jpg', publicId: 'rawaqa/products/football-new/img-7' },
    { url: 'https://res.cloudinary.com/dr5welrvq/image/upload/v1788812775/rawaqa/products/football-new/img-8.jpg', publicId: 'rawaqa/products/football-new/img-8' },
    { url: 'https://res.cloudinary.com/dr5welrvq/image/upload/v1788812779/rawaqa/products/football-new/img-9.jpg', publicId: 'rawaqa/products/football-new/img-9' },
  ],
  'RWQ-FB-2XL': [
    { url: 'https://res.cloudinary.com/dr5welrvq/image/upload/v1788812718/rawaqa/products/football-new/img-10.jpg', publicId: 'rawaqa/products/football-new/img-10' },
    { url: 'https://res.cloudinary.com/dr5welrvq/image/upload/v1788812723/rawaqa/products/football-new/img-11.jpg', publicId: 'rawaqa/products/football-new/img-11' },
    { url: 'https://res.cloudinary.com/dr5welrvq/image/upload/v1788812727/rawaqa/products/football-new/img-12.jpg', publicId: 'rawaqa/products/football-new/img-12' },
    { url: 'https://res.cloudinary.com/dr5welrvq/image/upload/v1788812731/rawaqa/products/football-new/img-13.jpg', publicId: 'rawaqa/products/football-new/img-13' },
  ],
  'RWQ-FB-3XL': [
    { url: 'https://res.cloudinary.com/dr5welrvq/image/upload/v1788812735/rawaqa/products/football-new/img-14.jpg', publicId: 'rawaqa/products/football-new/img-14' },
    { url: 'https://res.cloudinary.com/dr5welrvq/image/upload/v1788812739/rawaqa/products/football-new/img-15.jpg', publicId: 'rawaqa/products/football-new/img-15' },
    { url: 'https://res.cloudinary.com/dr5welrvq/image/upload/v1788812744/rawaqa/products/football-new/img-16.jpg', publicId: 'rawaqa/products/football-new/img-16' },
    { url: 'https://res.cloudinary.com/dr5welrvq/image/upload/v1788812747/rawaqa/products/football-new/img-17.jpg', publicId: 'rawaqa/products/football-new/img-17' },
  ],
};

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const secret = req.query.secret as string;
  const isAuthorized =
    secret === DEFAULT_SECRET ||
    (process.env['SEED_SECRET'] && secret === process.env['SEED_SECRET']) ||
    (process.env['EXPORT_PASSWORD'] && secret === process.env['EXPORT_PASSWORD']);

  if (!isAuthorized) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }

  try {
    const db = mongoose.connection;
    let fixed = 0;

    for (const [sku, images] of Object.entries(CORRECT_IMAGES)) {
      const formattedImages = images.map((img, i) => ({
        url:      img.url,
        publicId: img.publicId,
        alt:      `Product image ${i + 1}`,
        isPrimary: i === 0,
        order:    i,
      }));

      const result = await db.collection('products').updateOne(
        { sku },
        { $set: { images: formattedImages, updatedAt: new Date() } }
      );
      if (result.modifiedCount > 0) fixed++;
    }

    // Reset admin password
    const adminPass = process.env['ADMIN_PASSWORD'] ?? 'Admin@123456';
    const hashed    = await bcrypt.hash(adminPass, 10);
    await db.collection('users').updateOne(
      { email: process.env['ADMIN_EMAIL'] ?? 'admin@rawaqa.com' },
      { $set: { password: hashed, role: 'super_admin', isActive: true, isEmailVerified: true } },
      { upsert: true }
    );

    res.json({
      success: true,
      message: `✅ Fixed ${fixed}/6 products with correct Cloudinary URLs + admin reset`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
