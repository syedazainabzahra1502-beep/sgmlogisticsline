import type { CartItem } from "./sgm";
import { cartTotals, COMPANY } from "./sgm";

export type Invoice = { ref: string; company: string; trn: string; method: string; items: CartItem[]; date: string };

export async function downloadInvoice(inv: Invoice) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const t = cartTotals(inv.items);
  const m = (n: number) => "AED " + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  doc.setFontSize(14); doc.text(COMPANY.name, 14, 18);
  doc.setFontSize(8);
  doc.text(COMPANY.address, 14, 24);
  doc.text(`TRN ${COMPANY.trn}  ·  ${COMPANY.email}  ·  ${COMPANY.phone}`, 14, 29);
  doc.setFontSize(14); doc.text("TAX INVOICE", 160, 18);
  doc.setFontSize(9);
  ([["Invoice No", inv.ref], ["Date", inv.date], ["Bill to", inv.company], ["Customer TRN", inv.trn], ["Payment", inv.method]] as [string, string][]).forEach(([k, v], i) => {
    doc.text(k, 14, 42 + i * 6); doc.text(v, 50, 42 + i * 6);
  });
  let y = 80;
  doc.line(14, y - 5, 196, y - 5);
  doc.text("Description", 14, y); doc.text("Qty", 120, y); doc.text("Unit (AED)", 135, y); doc.text("Amount (AED)", 168, y);
  doc.line(14, y + 2, 196, y + 2);
  inv.items.forEach((i) => { y += 8; doc.text(i.name.slice(0, 60), 14, y); doc.text(String(i.qty), 120, y); doc.text(i.price.toFixed(2), 135, y); doc.text((i.price * i.qty).toFixed(2), 168, y); });
  y += 6; doc.line(14, y, 196, y);
  ([["Subtotal", m(t.subtotal)], ["VAT 5% (UAE)", m(t.vat)], ["Total", m(t.total)]] as [string, string][]).forEach(([k, v], i) => { doc.text(k, 130, y + 8 + i * 6); doc.text(v, 165, y + 8 + i * 6); });
  y += 36;
  doc.setFontSize(10); doc.text("Bank Transfer Details (Net-30)", 14, y);
  doc.setFontSize(9);
  ([["Bank", COMPANY.bank.name], ["Account name", COMPANY.bank.account], ["Account no.", COMPANY.bank.number], ["IBAN", COMPANY.bank.iban], ["SWIFT / BIC", COMPANY.bank.swift]] as [string, string][]).forEach(([k, v], i) => {
    doc.text(k, 14, y + 7 + i * 6); doc.text(v, 50, y + 7 + i * 6);
  });
  doc.setFontSize(8); doc.text("Please quote the invoice number as the transfer reference.", 14, y + 42);
  doc.save(`${inv.ref}-tax-invoice.pdf`);
}
