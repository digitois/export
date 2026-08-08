import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import 'server-only';

interface PdfLineItem {
  description: string;
  hsnCode?: string | null;
  quantity: number;
  unit?: string | null;
  unitPrice: number;
  amount: number;
}

export interface PdfDocumentData {
  title: string;
  documentNumber: string;
  date: string;
  dueDate?: string;
  companyName: string;
  companyDetails: string[];
  buyerName: string;
  buyerCompany?: string | null;
  buyerAddress?: string | null;
  buyerCountry?: string | null;
  currency: string;
  incoterm?: string;
  paymentTerms?: string;
  validityDays?: number;
  items: PdfLineItem[];
  subtotal: number;
  discount: number;
  tax: number;
  freight?: number;
  insurance?: number;
  total: number;
  notes?: string | null;
  terms?: string | null;
}

const MARGIN = 50;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

async function wrapText(font: PDFFont, size: number, text: string, maxWidth: number): Promise<string[]> {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function generateDocumentPdf(data: PdfDocumentData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  let page = doc.addPage([PAGE_WIDTH, 841.89]);
  const height = page.getHeight();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const dark = rgb(0.05, 0.09, 0.16);
  const gray = rgb(0.4, 0.45, 0.55);
  const light = rgb(0.93, 0.95, 0.98);
  const accent = rgb(0.03, 0.52, 0.78);

  let y = height - MARGIN;

  // Header
  page.drawText(data.companyName, { x: MARGIN, y, size: 22, font: fontBold, color: dark });
  y -= 16;
  page.drawText(data.documentNumber, { x: MARGIN, y, size: 12, font: font, color: accent });
  y -= 42;

  // Meta block
  for (const line of data.companyDetails) {
    page.drawText(line, { x: MARGIN, y, size: 9, font: font, color: gray });
    y -= 13;
  }

  // Title
  y -= 10;
  page.drawText(data.title, { x: MARGIN, y, size: 18, font: fontBold, color: dark });
  y -= 8;
  page.drawRectangle({ x: MARGIN, y, width: CONTENT_WIDTH, height: 1, color: accent });
  y -= 24;

  // Bill To
  page.drawText('BILL TO / BUYER', { x: MARGIN, y, size: 10, font: fontBold, color: dark });
  y -= 16;
  page.drawText(data.buyerName, { x: MARGIN, y, size: 11, font: fontBold, color: dark });
  y -= 14;
  if (data.buyerCompany) {
    page.drawText(data.buyerCompany, { x: MARGIN, y, size: 10, font: font, color: dark });
    y -= 14;
  }
  if (data.buyerAddress) {
    for (const line of await wrapText(font, 9, data.buyerAddress, CONTENT_WIDTH / 2)) {
      page.drawText(line, { x: MARGIN, y, size: 9, font: font, color: gray });
      y -= 12;
    }
  }
  if (data.buyerCountry) {
    page.drawText(data.buyerCountry, { x: MARGIN, y, size: 9, font: font, color: gray });
    y -= 12;
  }

  // Right-side meta
  const rightX = MARGIN + CONTENT_WIDTH / 2;
  page.drawText(`Date: ${data.date}`, { x: rightX, y: height - MARGIN - 16, size: 10, font: font, color: gray });
  if (data.dueDate) {
    page.drawText(`Due: ${data.dueDate}`, { x: rightX, y: height - MARGIN - 32, size: 10, font: font, color: gray });
  }
  if (data.incoterm) {
    page.drawText(`Incoterm: ${data.incoterm}`, { x: rightX, y: height - MARGIN - 48, size: 10, font: font, color: gray });
  }
  if (data.paymentTerms) {
    for (const line of await wrapText(font, 9, `Payment: ${data.paymentTerms}`, CONTENT_WIDTH / 2)) {
      page.drawText(line, { x: rightX, y: height - MARGIN - 48 - 16 * (line === data.paymentTerms ? 0 : 1), size: 9, font: font, color: gray });
    }
  }
  if (data.validityDays) {
    page.drawText(`Valid: ${data.validityDays} days`, { x: rightX, y: height - MARGIN - 80, size: 10, font: font, color: gray });
  }

  // Table header
  y -= 30;
  const colWidths = {
    description: CONTENT_WIDTH * 0.45,
    hsn: CONTENT_WIDTH * 0.12,
    qty: CONTENT_WIDTH * 0.1,
    unit: CONTENT_WIDTH * 0.08,
    rate: CONTENT_WIDTH * 0.12,
    amount: CONTENT_WIDTH * 0.13
  };

  page.drawRectangle({ x: MARGIN, y: y - 6, width: CONTENT_WIDTH, height: 24, color: light });
  page.drawText('Description', { x: MARGIN + 6, y, size: 9, font: fontBold, color: dark });
  page.drawText('HSN', { x: MARGIN + colWidths.description, y, size: 9, font: fontBold, color: dark });
  page.drawText('Qty', { x: MARGIN + colWidths.description + colWidths.hsn, y, size: 9, font: fontBold, color: dark });
  page.drawText('Unit', { x: MARGIN + colWidths.description + colWidths.hsn + colWidths.qty, y, size: 9, font: fontBold, color: dark });
  page.drawText('Rate', { x: MARGIN + colWidths.description + colWidths.hsn + colWidths.qty + colWidths.unit, y, size: 9, font: fontBold, color: dark });
  page.drawText('Amount', { x: MARGIN + CONTENT_WIDTH - colWidths.amount + 6, y, size: 9, font: fontBold, color: dark });
  y -= 28;

  for (const item of data.items) {
    if (y < 120) {
      page = doc.addPage([PAGE_WIDTH, 841.89]);
      y = height - MARGIN;
    }
    const lines = await wrapText(font, 9, item.description, colWidths.description);
    page.drawText(lines[0], { x: MARGIN + 6, y, size: 9, font: font, color: dark });
    if (item.hsnCode) page.drawText(item.hsnCode, { x: MARGIN + colWidths.description, y, size: 9, font: font, color: gray });
    page.drawText(String(item.quantity), { x: MARGIN + colWidths.description + colWidths.hsn, y, size: 9, font: font, color: dark });
    if (item.unit) page.drawText(item.unit, { x: MARGIN + colWidths.description + colWidths.hsn + colWidths.qty, y, size: 9, font: font, color: gray });
    page.drawText(item.unitPrice.toFixed(2), { x: MARGIN + colWidths.description + colWidths.hsn + colWidths.qty + colWidths.unit, y, size: 9, font: font, color: dark });
    page.drawText(item.amount.toFixed(2), { x: MARGIN + CONTENT_WIDTH - colWidths.amount + 6, y, size: 9, font: fontBold, color: dark });
    y -= 20;
    for (const extra of lines.slice(1)) {
      page.drawText(extra, { x: MARGIN + 6, y, size: 8, font: font, color: gray });
      y -= 14;
    }
    y -= 6;
  }

  // Totals
  y -= 20;
  if (y < 160) {
    page = doc.addPage([PAGE_WIDTH, 841.89]);
    y = height - MARGIN;
  }
  const totalsX = MARGIN + CONTENT_WIDTH - 200;
  const row = (label: string, value: string, bold = false) => {
    page.drawText(label, { x: totalsX, y, size: 10, font: bold ? fontBold : font, color: dark });
    page.drawText(value, { x: totalsX + 130, y, size: 10, font: bold ? fontBold : font, color: dark });
    y -= 18;
  };
  row('Subtotal', `${data.currency} ${data.subtotal.toFixed(2)}`);
  if (data.discount > 0) row('Discount', `${data.currency} -${data.discount.toFixed(2)}`);
  if (data.tax > 0) row('Tax', `${data.currency} ${data.tax.toFixed(2)}`);
  if (data.freight && data.freight > 0) row('Freight', `${data.currency} ${data.freight.toFixed(2)}`);
  if (data.insurance && data.insurance > 0) row('Insurance', `${data.currency} ${data.insurance.toFixed(2)}`);
  page.drawRectangle({ x: totalsX, y: y + 4, width: 200, height: 1, color: accent });
  row('TOTAL', `${data.currency} ${data.total.toFixed(2)}`, true);

  if (data.notes) {
    y -= 10;
    page.drawText('Notes:', { x: MARGIN, y, size: 9, font: fontBold, color: dark });
    y -= 13;
    for (const line of await wrapText(font, 8, data.notes, CONTENT_WIDTH)) {
      page.drawText(line, { x: MARGIN, y, size: 8, font: font, color: gray });
      y -= 11;
    }
  }
  if (data.terms) {
    y -= 6;
    page.drawText('Terms & Conditions:', { x: MARGIN, y, size: 9, font: fontBold, color: dark });
    y -= 13;
    for (const line of await wrapText(font, 8, data.terms, CONTENT_WIDTH)) {
      page.drawText(line, { x: MARGIN, y, size: 8, font: font, color: gray });
      y -= 11;
    }
  }

  page.drawText('Generated by Export OS', {
    x: MARGIN,
    y: 40,
    size: 8,
    font,
    color: gray
  });

  return doc.save();
}
