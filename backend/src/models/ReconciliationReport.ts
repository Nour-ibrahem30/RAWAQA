import mongoose, { Document, Schema } from 'mongoose';

export interface IDiscrepancy {
  sku:         string;
  name:        string;
  oldQuantity: number;
  newQuantity: number;
  difference:  number;
}

export interface IReconciliationReport extends Document {
  timestamp:     Date;
  totalProducts: number;
  syncedCount:   number;
  errorCount:    number;
  discrepancies: IDiscrepancy[];
  durationMs?:   number;
}

const discrepancySchema = new Schema<IDiscrepancy>(
  {
    sku:         { type: String, required: true },
    name:        { type: String, required: true },
    oldQuantity: { type: Number, required: true },
    newQuantity: { type: Number, required: true },
    difference:  { type: Number, required: true },
  },
  { _id: false }
);

const reconciliationReportSchema = new Schema<IReconciliationReport>(
  {
    timestamp:     { type: Date, required: true, default: Date.now },
    totalProducts: { type: Number, required: true, min: 0 },
    syncedCount:   { type: Number, required: true, min: 0 },
    errorCount:    { type: Number, required: true, min: 0 },
    discrepancies: { type: [discrepancySchema], default: [] },
    durationMs:    { type: Number, min: 0 },
  },
  { timestamps: true }
);

// Keep reports for 90 days, then auto-expire
reconciliationReportSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

reconciliationReportSchema.index({ timestamp: -1 });

export const ReconciliationReport = mongoose.model<IReconciliationReport>(
  'ReconciliationReport',
  reconciliationReportSchema
);
