'use client';

import { useState, useRef } from 'react';
import type { Order } from '@/lib/types';
import { formatPrice } from '@/lib/utils';

interface Props {
  order: Order;
  onClose: () => void;
  defaultLang?: 'ar' | 'en';
}

const GOV_AR: Record<string, string> = {
  cairo: 'القاهرة', giza: 'الجيزة', alexandria: 'الإسكندرية', qalyubia: 'القليوبية',
  dakahlia: 'الدقهلية', sharqia: 'الشرقية', gharbia: 'الغربية', monufia: 'المنوفية',
  beheira: 'البحيرة', kafr_el_sheikh: 'كفر الشيخ', damietta: 'دمياط',
  port_said: 'بورسعيد', ismailia: 'الإسماعيلية', suez: 'السويس',
  fayoum: 'الفيوم', beni_suef: 'بني سويف', minya: 'المنيا', asyut: 'أسيوط',
  sohag: 'سوهاج', qena: 'قنا', luxor: 'الأقصر', aswan: 'أسوان', red_sea: 'البحر الأحمر',
  north_sinai: 'شمال سيناء', south_sinai: 'جنوب سيناء', new_valley: 'الوادي الجديد', matruh: 'مطروح',
};

export default function OrderInvoiceModal({ order, onClose, defaultLang = 'ar' }: Props) {
  const [lang, setLang] = useState<'ar' | 'en'>(defaultLang);
  const [mode, setMode] = useState<'all' | 'waybill' | 'invoice'>('all');
  const printableRef = useRef<HTMLDivElement>(null);

  const isAr = lang === 'ar';
  const shipping = (order.shippingAddress || {}) as any;
  const userObj = (order as any).userId;

  const customerName =
    shipping.recipientName ||
    `${shipping.firstName || ''} ${shipping.lastName || ''}`.trim() ||
    (userObj && typeof userObj === 'object'
      ? `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim()
      : '') ||
    (isAr ? 'العميل' : 'Customer');

  const customerPhone = shipping.phone || (userObj && typeof userObj === 'object' ? userObj.phone : '') || '—';
  const govKey = (shipping.governorate || '').toLowerCase().replace(/\s+/g, '_');
  const govName = isAr ? (GOV_AR[govKey] || shipping.governorate || '—') : (shipping.governorate || '—');
  const cityName = shipping.city || '';
  const streetAddr = shipping.streetAddress || shipping.addressLine1 || '';
  const notes = shipping.notes || (order as any).customerNotes || '';
  const orderNumber = order.orderNumber || order.id || (order as any)._id || 'RWQ-000';
  const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }) : '—';

  const subtotal = order.subtotal || 0;
  const shippingCost = order.shippingCost || 0;
  const couponDiscount = order.couponDiscount || 0;
  const total = order.total || Math.max(0, subtotal + shippingCost - couponDiscount);

  const handlePrint = () => {
    if (!printableRef.current) return;
    const content = printableRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
      window.print();
      return;
    }

    const doc = printWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html dir="${isAr ? 'rtl' : 'ltr'}" lang="${isAr ? 'ar' : 'en'}">
        <head>
          <meta charset="utf-8" />
          <title>Order_${orderNumber}_${mode}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Manrope:wght@400;600;700;800&display=swap');
            
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: ${isAr ? "'Cairo', sans-serif" : "'Manrope', sans-serif"};
              background: #fff;
              color: #111;
              font-size: 12px;
              line-height: 1.4;
              padding: 0;
            }
            .invoice-wrapper {
              width: 100%;
              max-width: 100%;
              margin: 0 auto;
              background: #fff;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              padding: 7px 10px;
              border-bottom: 1px solid #e5e5e5;
            }
            th {
              background: #f8f8f8;
              font-weight: 700;
              color: #333;
            }
            .border-box {
              border: 1px solid #d5d5d5;
              border-radius: 8px;
              padding: 12px;
            }
            .highlight-box {
              border: 2px solid #000;
              background: #faf7ee;
              border-radius: 8px;
              padding: 12px 16px;
            }
            .barcode {
              font-family: monospace;
              letter-spacing: 4px;
              font-weight: 900;
              font-size: 16px;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .no-print {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="invoice-wrapper">
            ${content}
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    doc.close();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: '#181510',
          border: '1px solid rgba(210,181,106,.25)',
          borderRadius: 20,
          width: '100%',
          maxWidth: 900,
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,.9)',
          overflow: 'hidden',
        }}
      >
        {/* Top Control Bar */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b"
          style={{ borderColor: 'rgba(210,181,106,.15)', background: '#13110d' }}
        >
          {/* Document mode tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode('all')}
              style={{
                padding: '.4rem .85rem',
                borderRadius: 8,
                fontSize: '.8rem',
                fontWeight: 600,
                background: mode === 'all' ? '#D2B56A' : 'rgba(210,181,106,.1)',
                color: mode === 'all' ? '#15130F' : '#F7F4EC',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {isAr ? 'فاتورة وبوليصة شاملة' : 'Full Invoice & Waybill'}
            </button>
            <button
              onClick={() => setMode('waybill')}
              style={{
                padding: '.4rem .85rem',
                borderRadius: 8,
                fontSize: '.8rem',
                fontWeight: 600,
                background: mode === 'waybill' ? '#D2B56A' : 'rgba(210,181,106,.1)',
                color: mode === 'waybill' ? '#15130F' : '#F7F4EC',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {isAr ? 'بوليصة شحن للمندوب' : 'Courier Waybill'}
            </button>
            <button
              onClick={() => setMode('invoice')}
              style={{
                padding: '.4rem .85rem',
                borderRadius: 8,
                fontSize: '.8rem',
                fontWeight: 600,
                background: mode === 'invoice' ? '#D2B56A' : 'rgba(210,181,106,.1)',
                color: mode === 'invoice' ? '#15130F' : '#F7F4EC',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {isAr ? 'فاتورة مبيعات للعميل' : 'Customer Receipt'}
            </button>
          </div>

          {/* Language & Actions */}
          <div className="flex items-center gap-3">
            {/* Lang switcher */}
            <button
              onClick={() => setLang(l => (l === 'ar' ? 'en' : 'ar'))}
              style={{
                background: 'rgba(255,255,255,.07)',
                border: '1px solid rgba(210,181,106,.2)',
                borderRadius: 8,
                padding: '.35rem .75rem',
                color: '#D2B56A',
                fontSize: '.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {isAr ? 'English LTR' : 'العربية RTL'}
            </button>

            {/* Print button */}
            <button
              onClick={handlePrint}
              className="btn btn-gold"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '.4rem',
                padding: '.45rem 1.25rem',
                fontSize: '.82rem',
                fontWeight: 700,
                borderRadius: 10,
              }}
            >
              <span>🖨️</span>
              <span>{isAr ? 'طباعة / حفظ PDF' : 'Print / Save PDF'}</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(247,244,236,.5)',
                fontSize: '1.25rem',
                cursor: 'pointer',
                padding: '.25rem .5rem',
              }}
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Document Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center" style={{ background: '#0e0c09' }}>
          <div
            ref={printableRef}
            dir={isAr ? 'rtl' : 'ltr'}
            style={{
              width: '100%',
              maxWidth: 780,
              background: '#FFFFFF',
              color: '#151515',
              borderRadius: 8,
              padding: '28px 34px',
              fontFamily: isAr ? "'Cairo', sans-serif" : "'Manrope', sans-serif",
              boxShadow: '0 8px 30px rgba(0,0,0,.6)',
            }}
          >
            {/* Header / Brand */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #151515', paddingBottom: 16, marginBottom: 18 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#15130F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D2B56A', fontWeight: 900, fontSize: 18 }}>
                    R
                  </div>
                  <div>
                    <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '.05em', color: '#15130F', lineHeight: 1.1 }}>
                      RAWAQA | رَوَاقَـة
                    </h1>
                    <p style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                      {isAr ? 'أثاث منزلي عصري وبسطاء فاخرة' : 'Modern Luxury Living & Home Furniture'}
                    </p>
                  </div>
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: '#555' }}>
                  <p>📍 {isAr ? 'القاهرة، جمهورية مصر العربية' : 'Cairo, Egypt'} | 🌐 www.rawaqa.com</p>
                  <p>📞 {isAr ? 'خدمة العملاء والدعم' : 'Support'}: +20 100 000 0000</p>
                </div>
              </div>

              {/* Order Info & Barcode */}
              <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                <div style={{
                  display: 'inline-block',
                  background: '#15130F',
                  color: '#D2B56A',
                  fontWeight: 800,
                  fontSize: 12,
                  padding: '4px 12px',
                  borderRadius: 6,
                  marginBottom: 6,
                  letterSpacing: '.04em',
                }}>
                  {mode === 'waybill'
                    ? (isAr ? 'بوليصة شحن وتوصيل (COD)' : 'DELIVERY WAYBILL (COD)')
                    : mode === 'invoice'
                    ? (isAr ? 'فاتورة مبيعات' : 'SALES INVOICE')
                    : (isAr ? 'فاتورة وبوليصة شحن' : 'INVOICE & WAYBILL')}
                </div>
                <p style={{ fontFamily: 'monospace', fontSize: 17, fontWeight: 900, letterSpacing: '2px', color: '#111' }}>
                  #{orderNumber}
                </p>
                <p style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                  {isAr ? 'تاريخ الطلب: ' : 'Date: '}<strong>{orderDate}</strong>
                </p>
                <div style={{ marginTop: 6, display: 'inline-block', padding: '3px 8px', border: '1px dashed #999', fontFamily: 'monospace', fontSize: 11, letterSpacing: '3px' }}>
                  *{orderNumber.replace(/[^A-Za-z0-9]/g, '')}*
                </div>
              </div>
            </div>

            {/* Crucial: COD Highlight Box (مبلغ التحصيل المطلوب) */}
            <div style={{
              background: '#FFFDF5',
              border: '2px solid #D2B56A',
              borderRadius: 8,
              padding: '12px 18px',
              marginBottom: 20,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <span style={{
                  display: 'inline-block',
                  background: '#B45309',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 4,
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}>
                  {isAr ? 'طريقة الدفع: الدفع عند الاستلام فقط' : 'PAYMENT: CASH ON DELIVERY ONLY'}
                </span>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#15130F', marginTop: 2 }}>
                  {isAr ? 'المبلغ المطلوب تحصيله من العميل عند التسليم:' : 'COD Amount to Collect from Customer:'}
                </h3>
              </div>
              <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                <span style={{ fontSize: 26, fontWeight: 900, color: '#15130F', fontFamily: 'sans-serif' }}>
                  {formatPrice(total, isAr ? 'ar' : 'en')}
                </span>
                <p style={{ fontSize: 10, color: '#666', fontWeight: 600 }}>
                  {isAr ? 'شامل المنتجات + مصاريف الشحن' : 'Includes items + delivery fee'}
                </p>
              </div>
            </div>

            {/* Address & Customer Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {/* Receiver (المستلم) */}
              <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: '12px 14px', background: '#fafafa' }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#888', textTransform: 'uppercase', marginBottom: 6, borderBottom: '1px solid #eee', paddingBottom: 4 }}>
                  {isAr ? 'بيانات المستلم والتوصيل (Customer / Ship To)' : 'Customer & Delivery Info'}
                </p>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>
                  👤 {customerName}
                </p>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#0066cc', marginTop: 4, fontFamily: 'monospace' }}>
                  📞 {customerPhone}
                </p>
                <div style={{ marginTop: 6, fontSize: 12, color: '#333', lineHeight: 1.4 }}>
                  <p><strong>{isAr ? 'المحافظة والمدينة: ' : 'Gov & City: '}</strong>{govName} {cityName ? ` - ${cityName}` : ''}</p>
                  <p><strong>{isAr ? 'العنوان بالتفصيل: ' : 'Address: '}</strong>{streetAddr || '—'}</p>
                </div>
                {notes && (
                  <div style={{ marginTop: 8, background: '#fff', border: '1px dashed #ccc', borderRadius: 6, padding: '6px 8px', fontSize: 11, color: '#555' }}>
                    <strong>{isAr ? 'ملاحظات التوصيل: ' : 'Delivery Notes: '}</strong>{notes}
                  </div>
                )}
              </div>

              {/* Sender (الراسل) */}
              <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: '12px 14px', background: '#fafafa' }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#888', textTransform: 'uppercase', marginBottom: 6, borderBottom: '1px solid #eee', paddingBottom: 4 }}>
                  {isAr ? 'مرسل الشحنة (Shipper / Return To)' : 'Shipper & Return Info'}
                </p>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#111' }}>
                  🏢 {isAr ? 'شركة ومصنع رواقة للأثاث' : 'RAWAQA Furniture & Living'}
                </p>
                <p style={{ fontSize: 12, color: '#444', marginTop: 4 }}>
                  📍 {isAr ? 'المقر الرئيسي والمستودعات: القاهرة، مصر' : 'Main Hub & Warehouse: Cairo, Egypt'}
                </p>
                <p style={{ fontSize: 12, color: '#444', marginTop: 2 }}>
                  📞 +20 100 000 0000 | ✉️ orders@rawaqa.com
                </p>
                <div style={{ marginTop: 10, padding: '6px 8px', background: '#f0f0f0', borderRadius: 6, fontSize: 10, color: '#666' }}>
                  {isAr
                    ? 'في حال عدم الرد أو تعذر الوصول للعميل، يرجى التواصل مع الإدارة قبل إرجاع الشحنة.'
                    : 'If customer is unreachable, please contact dispatch before returning parcel.'}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div style={{ marginBottom: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f3f3f3', borderTop: '1px solid #111', borderBottom: '2px solid #111' }}>
                    <th style={{ textAlign: isAr ? 'right' : 'left', padding: '8px 10px', width: 35 }}>#</th>
                    <th style={{ textAlign: isAr ? 'right' : 'left', padding: '8px 10px' }}>
                      {isAr ? 'بيان المنتج / الصنف' : 'Item Description'}
                    </th>
                    <th style={{ textAlign: 'center', padding: '8px 10px', width: 100 }}>
                      {isAr ? 'الكود (SKU)' : 'SKU'}
                    </th>
                    <th style={{ textAlign: 'center', padding: '8px 10px', width: 65 }}>
                      {isAr ? 'الكمية' : 'Qty'}
                    </th>
                    <th style={{ textAlign: isAr ? 'left' : 'right', padding: '8px 10px', width: 100 }}>
                      {isAr ? 'سعر الوحدة' : 'Unit Price'}
                    </th>
                    <th style={{ textAlign: isAr ? 'left' : 'right', padding: '8px 10px', width: 110 }}>
                      {isAr ? 'الإجمالي' : 'Total'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items || []).map((item: any, idx: number) => {
                    const nameAr = item.productSnapshot?.nameAr || item.product?.nameAr || item.nameAr || '';
                    const nameEn = item.productSnapshot?.nameEn || item.product?.nameEn || item.nameEn || '';
                    const sku = item.productSnapshot?.sku || item.product?.sku || item.sku || '—';
                    const qty = item.quantity || 1;
                    const price = item.price || 0;
                    const itemTotal = item.subtotal || item.total || (price * qty);

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #e5e5e5' }}>
                        <td style={{ textAlign: isAr ? 'right' : 'left', padding: '9px 10px', color: '#777', fontWeight: 600 }}>
                          {idx + 1}
                        </td>
                        <td style={{ textAlign: isAr ? 'right' : 'left', padding: '9px 10px' }}>
                          <p style={{ fontWeight: 700, color: '#15130F', fontSize: 12 }}>
                            {isAr ? (nameAr || nameEn) : (nameEn || nameAr)}
                          </p>
                        </td>
                        <td style={{ textAlign: 'center', padding: '9px 10px', fontFamily: 'monospace', fontSize: 11, color: '#555' }}>
                          {sku}
                        </td>
                        <td style={{ textAlign: 'center', padding: '9px 10px', fontWeight: 800, fontSize: 13 }}>
                          {qty}
                        </td>
                        <td style={{ textAlign: isAr ? 'left' : 'right', padding: '9px 10px', color: '#444' }}>
                          {formatPrice(price, isAr ? 'ar' : 'en')}
                        </td>
                        <td style={{ textAlign: isAr ? 'left' : 'right', padding: '9px 10px', fontWeight: 800, color: '#111' }}>
                          {formatPrice(itemTotal, isAr ? 'ar' : 'en')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Calculations Breakdown */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
              <div style={{ width: '100%', maxWidth: 320, border: '1px solid #e0e0e0', borderRadius: 8, padding: '12px 16px', background: '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, fontSize: 12 }}>
                  <span style={{ color: '#666' }}>{isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                  <span style={{ fontWeight: 600 }}>{formatPrice(subtotal, isAr ? 'ar' : 'en')}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, fontSize: 12 }}>
                  <span style={{ color: '#666' }}>{isAr ? 'تكلفة الشحن والتوصيل:' : 'Delivery Fee:'}</span>
                  <span style={{ fontWeight: 600, color: shippingCost === 0 ? '#16a34a' : '#111' }}>
                    {shippingCost === 0 ? (isAr ? 'مجاني' : 'Free') : formatPrice(shippingCost, isAr ? 'ar' : 'en')}
                  </span>
                </div>

                {couponDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, fontSize: 12, color: '#16a34a' }}>
                    <span>{isAr ? `خصم الكوبون (${order.couponCode || ''}):` : `Discount (${order.couponCode || ''}):`}</span>
                    <span style={{ fontWeight: 700 }}>- {formatPrice(couponDiscount, isAr ? 'ar' : 'en')}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, marginTop: 4, borderTop: '2px solid #111', fontSize: 14, fontWeight: 900 }}>
                  <span>{isAr ? 'صافي المبلغ المستحق (COD):' : 'Total to Collect (COD):'}</span>
                  <span style={{ color: '#15130F', fontSize: 16 }}>{formatPrice(total, isAr ? 'ar' : 'en')}</span>
                </div>
              </div>
            </div>

            {/* Courier & Customer Signatures */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, borderTop: '1px solid #ddd', paddingTop: 16, marginBottom: 18 }}>
              <div style={{ border: '1px dashed #ccc', borderRadius: 6, padding: '10px 12px', minHeight: 75, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>
                  {isAr ? 'ختم وتوقيع متجر رواقة:' : 'Store Authorized Sign:'}
                </span>
                <span style={{ fontSize: 10, color: '#999', borderTop: '1px solid #eee', paddingTop: 4 }}>
                  {isAr ? 'المخزن / التجهيز' : 'Warehouse Dispatch'}
                </span>
              </div>

              <div style={{ border: '1px dashed #ccc', borderRadius: 6, padding: '10px 12px', minHeight: 75, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>
                  {isAr ? 'توقيع واسم مندوب الشحن:' : 'Courier Sign & Name:'}
                </span>
                <span style={{ fontSize: 10, color: '#999', borderTop: '1px solid #eee', paddingTop: 4 }}>
                  {isAr ? 'تاريخ الاستلام من المخزن' : 'Pickup Date'}
                </span>
              </div>

              <div style={{ border: '1px dashed #ccc', borderRadius: 6, padding: '10px 12px', minHeight: 75, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>
                  {isAr ? 'توقيع المستلم بالاستلام والسداد:' : 'Customer Receipt Sign:'}
                </span>
                <span style={{ fontSize: 10, color: '#999', borderTop: '1px solid #eee', paddingTop: 4 }}>
                  {isAr ? 'استلمت بحالة جيدة وسددت المبلغ' : 'Received in Good Condition & Paid'}
                </span>
              </div>
            </div>

            {/* Terms & Footer */}
            <div style={{ borderTop: '1px solid #eee', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: '#777' }}>
              <p>
                {isAr
                  ? '• يحق للعميل معاينة المنتجات والتأكد من سلامتها ومطابقتها للمواصفات عند الاستلام من المندوب.'
                  : '• Customer is entitled to inspect parcel contents before courier handover.'}
              </p>
              <p style={{ flexShrink: 0 }}>
                {isAr ? 'طُبعت بتاريخ: ' : 'Printed on: '}
                {new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
