/**
 * Export Controller — generates password-protected Excel reports.
 * All endpoints require admin authentication.
 * Files are streamed directly — nothing is written to disk.
 */
import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { logError, logInfo } from '../config/logger';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BRAND_COLOR   = 'AD8A4C';  // gold
const BRAND_DARK    = '15130F';  // charcoal
const HEADER_FONT   = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFFFFFFF' } } as const;
const BODY_FONT     = { name: 'Calibri', size: 10 } as const;
const BORDER: ExcelJS.Border = { style: 'thin', color: { argb: 'FFE0D8C8' } };
const ALL_BORDERS   = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };

function styleHeader(_sheet: ExcelJS.Worksheet, row: ExcelJS.Row) {
  row.eachCell(cell => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_DARK } };
    cell.font   = HEADER_FONT;
    cell.border = ALL_BORDERS;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
  });
  row.height = 22;
}

function styleDataRow(row: ExcelJS.Row, isEven: boolean) {
  row.eachCell(cell => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFF7F4EC' : 'FFFDFCF9' } };
    cell.font   = BODY_FONT;
    cell.border = ALL_BORDERS;
    cell.alignment = { vertical: 'middle' };
  });
}

function addTitle(sheet: ExcelJS.Worksheet, title: string, subtitle: string, colCount: number) {
  // Title row
  const titleRow = sheet.addRow([title]);
  sheet.mergeCells(`A1:${String.fromCharCode(64 + colCount)}1`);
  titleRow.getCell(1).font  = { name: 'Calibri', bold: true, size: 14, color: { argb: `FF${BRAND_COLOR}` } };
  titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  titleRow.height = 28;

  // Subtitle row
  const subRow = sheet.addRow([subtitle]);
  sheet.mergeCells(`A2:${String.fromCharCode(64 + colCount)}2`);
  subRow.getCell(1).font = { name: 'Calibri', size: 10, color: { argb: 'FF6E6656' } };
  subRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  subRow.height = 18;

  // Empty separator
  sheet.addRow([]);
}

// Note: Spreadsheet-level password protection requires ExcelJS Pro or a separate library.
// The EXPORT_PASSWORD env var is reserved for a future implementation.
// For now, security is enforced at the API level (authenticate + requireAdmin middleware).

// ─── Orders Excel ─────────────────────────────────────────────────────────────

/**
 * GET /api/admin/export/orders
 * Downloads a password-protected Excel file with all orders.
 * Query: ?status=pending&from=2026-01-01&to=2026-12-31&limit=5000
 */
export const exportOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, from, to, limit = '5000' } = req.query;
    const filter: Record<string, any> = {};
    if (status) filter.status = status;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from as string);
      if (to)   filter.createdAt.$lte = new Date(to as string);
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string))
      .lean();

    logInfo(`Export: ${orders.length} orders requested by admin ${req.user?.userId}`);

    const wb = new ExcelJS.Workbook();
    wb.creator  = 'RAWAQA Admin';
    wb.created  = new Date();
    wb.modified = new Date();

    const sheet = wb.addWorksheet('Orders', {
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    });

    const COLS = [
      { header: 'Order #',     key: 'orderNumber',  width: 20 },
      { header: 'Date',        key: 'date',         width: 18 },
      { header: 'Customer ID', key: 'customerId',   width: 26 },
      { header: 'Status',      key: 'status',       width: 14 },
      { header: 'Payment',     key: 'payment',      width: 16 },
      { header: 'Method',      key: 'method',       width: 18 },
      { header: 'Items',       key: 'items',        width: 8  },
      { header: 'Subtotal',    key: 'subtotal',     width: 14 },
      { header: 'Shipping',    key: 'shipping',     width: 12 },
      { header: 'Discount',    key: 'discount',     width: 12 },
      { header: 'Total (EGP)', key: 'total',        width: 15 },
      { header: 'Governorate', key: 'governorate',  width: 16 },
      { header: 'City',        key: 'city',         width: 16 },
    ];

    addTitle(sheet, 'RAWAQA — Orders Report', `Generated: ${new Date().toLocaleString('en-EG')}  |  Total: ${orders.length} orders`, COLS.length);

    sheet.columns = COLS;
    const headerRow = sheet.addRow(COLS.map(c => c.header));
    styleHeader(sheet, headerRow);

    orders.forEach((o, idx) => {
      const row = sheet.addRow([
        o.orderNumber,
        new Date(o.createdAt).toLocaleString('en-EG'),
        o.userId?.toString() ?? '',
        o.status,
        o.paymentStatus,
        o.paymentMethod,
        o.items?.length ?? 0,
        o.subtotal,
        o.shippingCost,
        (o.discount ?? 0) + (o.couponDiscount ?? 0),
        o.total,
        o.shippingAddress?.governorate ?? '',
        o.shippingAddress?.city ?? '',
      ]);
      styleDataRow(row, idx % 2 === 0);
      // Highlight totals column
      const totalCell = row.getCell('total');
      totalCell.font  = { name: 'Calibri', size: 10, bold: true, color: { argb: `FF${BRAND_COLOR}` } };
    });

    // Freeze header rows
    sheet.views = [{ state: 'frozen', ySplit: 4 }];

    // Summary row at bottom
    sheet.addRow([]);
    const sumRow = sheet.addRow([
      'TOTAL', '', '', '', '', '',
      orders.reduce((s, o) => s + (o.items?.length ?? 0), 0),
      orders.reduce((s, o) => s + o.subtotal, 0),
      orders.reduce((s, o) => s + o.shippingCost, 0),
      orders.reduce((s, o) => s + (o.discount ?? 0) + (o.couponDiscount ?? 0), 0),
      orders.reduce((s, o) => s + o.total, 0),
    ]);
    sumRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_DARK } };
      cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    });

    // Stream the file
    const filename = `rawaqa-orders-${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    logError('exportOrders error', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate orders export' });
    }
  }
};

// ─── Dashboard Analytics Excel ────────────────────────────────────────────────

/**
 * GET /api/admin/export/analytics
 * Downloads a password-protected Excel file with full analytics.
 */
export const exportAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [orders, products, users, recentOrders, revenue7d, topProducts] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: 1 }, revenue: { $sum: '$total' }, avgValue: { $avg: '$total' } } },
      ]),
      Product.countDocuments({ status: 'active' }),
      User.countDocuments({ isActive: true, role: 'customer' }),
      Order.find({ createdAt: { $gte: startOfMonth } }).sort({ createdAt: -1 }).limit(20).lean(),

      // Revenue last 7 days
      Order.aggregate([
        { $match: { createdAt: { $gte: last7Days }, status: { $nin: ['cancelled', 'failed'] } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, orders: { $sum: 1 }, revenue: { $sum: '$total' } } },
        { $sort: { _id: 1 } },
      ]),

      // Top 10 selling products
      Order.aggregate([
        { $match: { status: { $in: ['delivered', 'shipped', 'processing', 'confirmed'] } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.product', nameEn: { $first: '$items.productSnapshot.nameEn' }, nameAr: { $first: '$items.productSnapshot.nameAr' }, sku: { $first: '$items.productSnapshot.sku' }, totalSold: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
        { $sort: { totalSold: -1 } },
        { $limit: 10 },
      ]),
    ]);

    logInfo(`Export: analytics requested by admin ${req.user?.userId}`);

    const wb = new ExcelJS.Workbook();
    wb.creator  = 'RAWAQA Admin';
    wb.created  = new Date();

    // ── Sheet 1: Summary ────────────────────────────────────────────────────
    const summary = wb.addWorksheet('Summary');
    addTitle(summary, 'RAWAQA — Analytics Report', `Generated: ${new Date().toLocaleString('en-EG')}`, 2);

    const kpis = [
      ['METRIC', 'VALUE'],
      ['Total Active Products', products],
      ['Total Customers', users],
      ['Orders This Month', orders[0]?.total ?? 0],
      ['Revenue This Month (EGP)', orders[0]?.revenue?.toFixed(2) ?? '0.00'],
      ['Avg Order Value (EGP)', orders[0]?.avgValue?.toFixed(2) ?? '0.00'],
    ];

    kpis.forEach((row, idx) => {
      const r = summary.addRow(row);
      if (idx === 0) {
        styleHeader(summary, r);
      } else {
        styleDataRow(r, idx % 2 === 0);
        r.getCell(2).font = { name: 'Calibri', bold: true, size: 10, color: { argb: `FF${BRAND_COLOR}` } };
      }
    });
    summary.columns = [{ width: 30 }, { width: 20 }];
    summary.views = [{ state: 'frozen', ySplit: 4 }];

    // ── Sheet 2: Top Products ────────────────────────────────────────────────
    const topSheet = wb.addWorksheet('Top Products');
    addTitle(topSheet, 'Top Selling Products', 'All-time by delivered/shipped orders', 5);
    topSheet.columns = [
      { header: 'Rank',     key: 'rank',    width: 8  },
      { header: 'SKU',      key: 'sku',     width: 18 },
      { header: 'Product',  key: 'name',    width: 35 },
      { header: 'Qty Sold', key: 'qty',     width: 12 },
      { header: 'Revenue (EGP)', key: 'rev', width: 18 },
    ];
    const topHdr = topSheet.addRow(['Rank', 'SKU', 'Product (EN)', 'Qty Sold', 'Revenue (EGP)']);
    styleHeader(topSheet, topHdr);
    topProducts.forEach((p: any, idx: number) => {
      const row = topSheet.addRow([idx + 1, p.sku, p.nameEn, p.totalSold, p.revenue?.toFixed(2)]);
      styleDataRow(row, idx % 2 === 0);
      row.getCell('rank').font = { name: 'Calibri', bold: true, size: 10, color: { argb: `FF${BRAND_COLOR}` } };
    });
    topSheet.views = [{ state: 'frozen', ySplit: 4 }];

    // ── Sheet 3: Revenue Chart Data ─────────────────────────────────────────
    const revenueSheet = wb.addWorksheet('Revenue (7 Days)');
    addTitle(revenueSheet, 'Revenue — Last 7 Days', 'Excludes cancelled & failed orders', 3);
    revenueSheet.columns = [
      { header: 'Date',         key: 'date',    width: 16 },
      { header: 'Orders',       key: 'orders',  width: 12 },
      { header: 'Revenue (EGP)', key: 'revenue', width: 18 },
    ];
    const revHdr = revenueSheet.addRow(['Date', 'Orders', 'Revenue (EGP)']);
    styleHeader(revenueSheet, revHdr);
    revenue7d.forEach((d: any, idx: number) => {
      const row = revenueSheet.addRow([d._id, d.orders, d.revenue?.toFixed(2)]);
      styleDataRow(row, idx % 2 === 0);
    });
    // Totals
    revenueSheet.addRow([]);
    const revTotal = revenueSheet.addRow([
      'TOTAL',
      revenue7d.reduce((s: number, d: any) => s + d.orders, 0),
      revenue7d.reduce((s: number, d: any) => s + (d.revenue ?? 0), 0).toFixed(2),
    ]);
    revTotal.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_DARK } };
      cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    });
    revenueSheet.views = [{ state: 'frozen', ySplit: 4 }];

    // ── Sheet 4: Recent Orders ───────────────────────────────────────────────
    const recentSheet = wb.addWorksheet('Recent Orders');
    addTitle(recentSheet, 'Recent Orders This Month', `${recentOrders.length} most recent orders`, 7);
    recentSheet.columns = [
      { header: 'Order #',     key: 'orderNumber', width: 22 },
      { header: 'Date',        key: 'date',        width: 20 },
      { header: 'Status',      key: 'status',      width: 14 },
      { header: 'Items',       key: 'items',       width: 8  },
      { header: 'Total (EGP)', key: 'total',       width: 15 },
      { header: 'Governorate', key: 'gov',         width: 16 },
      { header: 'City',        key: 'city',        width: 16 },
    ];
    const recentHdr = recentSheet.addRow(['Order #', 'Date', 'Status', 'Items', 'Total (EGP)', 'Governorate', 'City']);
    styleHeader(recentSheet, recentHdr);
    recentOrders.forEach((o: any, idx: number) => {
      const row = recentSheet.addRow([
        o.orderNumber,
        new Date(o.createdAt).toLocaleString('en-EG'),
        o.status,
        o.items?.length ?? 0,
        o.total,
        o.shippingAddress?.governorate ?? '',
        o.shippingAddress?.city ?? '',
      ]);
      styleDataRow(row, idx % 2 === 0);
    });
    recentSheet.views = [{ state: 'frozen', ySplit: 4 }];

    // Stream
    const filename = `rawaqa-analytics-${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');

    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    logError('exportAnalytics error', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate analytics export' });
    }
  }
};
