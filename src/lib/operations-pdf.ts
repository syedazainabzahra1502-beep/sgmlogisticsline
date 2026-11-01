import { COMPANY, cartTotals } from './sgm';
import { driverPacket, type Job, type Details, type Pod } from './operations';
import { supabase } from '@/integrations/supabase/client';

export async function jobPDF(kind: 'quote' | 'packet' | 'pod', job: Job, d: Details, link = '') {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF(); let y = 18;
  const line = (text: string, size = 10) => { pdf.setFontSize(size); const parts = pdf.splitTextToSize(text, 178) as string[]; if (y + parts.length * 5 > 278) { pdf.addPage(); y = 18; } pdf.text(parts, 16, y); y += parts.length * 5 + 3; };
  line(COMPANY.name, 14);
  // Browser canvas shapes Arabic correctly without an unlicensed PDF font or a fabricated company stamp.
  const canvas = document.createElement('canvas'); canvas.width = 1500; canvas.height = 90;
  const ctx = canvas.getContext('2d');
  if (ctx) { ctx.font = '36px sans-serif'; ctx.textAlign = 'right'; ctx.fillText(COMPANY.nameAr, 1490, 54); pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 16, y, 178, 11); y += 17; }
  line(COMPANY.address, 8); line(`${COMPANY.email} | ${COMPANY.phone}`, 8);
  line(kind === 'quote' ? 'COMMERCIAL QUOTATION — NOT A TAX INVOICE' : kind === 'pod' ? 'ELECTRONIC PROOF OF DELIVERY' : 'FIELD DISPATCH PACKET', 13);
  line(`${job.reference} | ${new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Dubai' })}`);
  line(`Customer: ${job.customer || d.consignee || 'Not recorded'}`);
  line(`Route: ${job.origin} to ${job.destination}`);
  if (kind === 'quote') {
    line(`Validity: ${d.quoteDays} days from issue | Currency: AED`);
    const items = [...d.items]; if (d.mobilization > 0) items.push({ id: 'mob', name: 'Mobilization', price: d.mobilization, qty: 1, unit: 'per move' });
    items.forEach(i => line(`${i.name} | ${i.qty} x AED ${i.price.toFixed(2)} = AED ${(i.price * i.qty).toFixed(2)}`));
    const t = cartTotals(items); line(`Subtotal: AED ${t.subtotal.toFixed(2)} | VAT estimate (5%): AED ${t.vat.toFixed(2)} | Total: AED ${t.total.toFixed(2)}`);
    line('VAT treatment subject to verified VAT registration and applicable supply rules.', 8);
    line(d.quoteTerms); line('Authorized signature: __________________   Company stamp: __________________');
  } else if (kind === 'packet') {
    line(driverPacket(job, d, link), 9);
    if (link) { const QR = await import('qrcode'); if (y > 220) { pdf.addPage(); y = 18; } pdf.addImage(await QR.toDataURL(link), 'PNG', 16, y, 42, 42); }
  } else {
    const p = job.pod as unknown as Pod | null;
    if (!p) throw new Error('No delivery record yet.');
    line(`Received by: ${p.receiver}`); line(`Recorded (GST): ${new Date(p.at).toLocaleString('en-GB', { timeZone: 'Asia/Dubai' })}`); line(`Exceptions: ${p.remarks || 'None recorded'}`);
    for (const [i, path] of [p.signature, ...p.photos].entries()) {
      const r = await supabase.storage.from('dispatch-documents').download(path); if (r.error || !r.data) throw new Error('Delivery image unavailable.');
      const image = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(r.data); });
      if (y > 170) { pdf.addPage(); y = 18; } line(i === 0 ? 'Receiver signature' : `Cargo photo ${i}`); pdf.addImage(image, image.startsWith('data:image/png') ? 'PNG' : 'JPEG', 16, y, 120, 70); y += 78;
    }
  }
  pdf.save(`${job.reference}-${kind}.pdf`);
}