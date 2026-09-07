import mongoose, { Document, Schema } from 'mongoose';

export interface ISiteColors {
  charcoal: string;
  charcoalSoft: string;
  ivory: string;
  ivory2: string;
  sand: string;
  gold: string;
  goldLight: string;
  goldPale: string;
  ink: string;
  inkSoft: string;
  clay: string;
  indigo: string;
  ochre: string;
  forest: string;
  dune: string;
}

export interface ISiteSettings extends Document {
  key: string;          // singleton key: 'default'
  colors: ISiteColors;
  updatedBy?: string;
  updatedAt: Date;
}

const colorSchema = new Schema<ISiteColors>(
  {
    charcoal:    { type: String, default: '#15130F' },
    charcoalSoft:{ type: String, default: '#1E1B15' },
    ivory:       { type: String, default: '#F7F4EC' },
    ivory2:      { type: String, default: '#FDFCF9' },
    sand:        { type: String, default: '#E8E0D2' },
    gold:        { type: String, default: '#AD8A4C' },
    goldLight:   { type: String, default: '#D2B56A' },
    goldPale:    { type: String, default: '#E7D8B4' },
    ink:         { type: String, default: '#262117' },
    inkSoft:     { type: String, default: '#6E6656' },
    clay:        { type: String, default: '#A8543A' },
    indigo:      { type: String, default: '#3B5578' },
    ochre:       { type: String, default: '#BE8F2E' },
    forest:      { type: String, default: '#4B5B45' },
    dune:        { type: String, default: '#C9A876' },
  },
  { _id: false }
);

const siteSettingsSchema = new Schema<ISiteSettings>(
  {
    key:       { type: String, default: 'default', unique: true },
    colors:    { type: colorSchema, default: () => ({}) },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

export const SiteSettings = mongoose.model<ISiteSettings>('SiteSettings', siteSettingsSchema);
