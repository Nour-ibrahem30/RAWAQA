/**
 * SiteContent — stores editable text and images for each page section.
 * Each document has a unique `section` key.
 * Admin can edit via PUT /api/admin/content/:section
 * Frontend fetches via GET /api/content/:section
 */
import mongoose, { Document, Schema } from 'mongoose';

export interface ISiteContent extends Document {
  section:   string;           // e.g. 'hero', 'about', 'why'
  data:      Record<string, any>; // flexible JSON — differs per section
  updatedBy?: string;
  updatedAt:  Date;
  createdAt:  Date;
}

const siteContentSchema = new Schema<ISiteContent>(
  {
    section:   { type: String, required: true, unique: true, trim: true },
    data:      { type: Schema.Types.Mixed, required: true, default: {} },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

export const SiteContent = mongoose.model<ISiteContent>('SiteContent', siteContentSchema);
