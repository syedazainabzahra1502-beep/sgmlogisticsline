import type { CartItem } from "./sgm";
import { cartTotals } from "./sgm";

export type Invoice = { ref: string; company: string; trn: string; method: string; items: CartItem[]; date: string };

export async function downloadInvoice(inv: Invoice) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const t = cartTotals(inv.items);
  const m = (n: number) => "USD " + n.toFixed(2);
  doc.setFontSize(16); doc.text("SGM Global Line Logistics", 14, 18);
  doc.setFontSize(9); doc.text("Middle East Operations · Jebel Ali Free Zone, Dubai, UAE", 14, 24);
  doc.setFontSize(14); doc.text("TAX INVOICE", 150, 18);
  doc.setFontSize(9);
  [["Invoice No", inv.ref], ["Date", inv.date], ["Bill to", inv.company], ["Customer TRN", inv.trn], ["Payment", inv.method]].forEach(([k, v], i) => {
    doc.text(k, 14, 38 + i * 6); doc.text(v, 50, 38 + i * 6);
  });
  let y = 76;
  doc.line(14, y - 5, 196, y - 5);
  doc.text("Description", 14, y); doc.text("Qty", 130, y); doc.text("Unit", 145, y); doc.text("Amount", 175, y);
  doc.line(14, y + 2, 196, y + 2);
  inv.items.forEach((i) => { y += 8; doc.text(i.name, 14, y); doc.text(String(i.qty), 130, y); doc.text(i.price.toFixed(2), 145, y); doc.text((i.price * i.qty).toFixed(2), 175, y); });
  y += 6; doc.line(14, y, 196, y);
  [["Subtotal", m(t.subtotal)], ["VAT 5% (UAE)", m(t.vat)], ["Total", m(t.total)]].forEach(([k, v], i) => { doc.text(k, 140, y + 8 + i * 6); doc.text(v, 170, y + 8 + i * 6); });
  doc.save(`${inv.ref}-tax-invoice.pdf`);
}
