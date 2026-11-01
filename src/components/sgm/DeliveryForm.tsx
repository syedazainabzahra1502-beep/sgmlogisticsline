import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import type SignaturePad from 'signature_pad';
import { Button } from '@/components/ui/button';
import { completeDelivery } from '@/lib/operations.functions';
import { JobField } from './JobFields';
async function photoData(file: File) {
  if (!['image/jpeg','image/png'].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error('Use PNG/JPEG photos under 10 MB.');
  const image = await createImageBitmap(file); const scale = Math.min(1, 1200 / Math.max(image.width,image.height));
  const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width*scale); canvas.height = Math.round(image.height*scale);
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Photo could not be prepared.'); ctx.drawImage(image,0,0,canvas.width,canvas.height); image.close(); return canvas.toDataURL('image/jpeg',0.8);
}
export function DeliveryForm({ token, onDone }: { token: string; onDone: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null); const pad = useRef<SignaturePad | null>(null);
  const [receiver,setReceiver] = useState(''); const [remarks,setRemarks] = useState(''); const [photos,setPhotos] = useState<string[]>([]); const [msg,setMsg] = useState(''); const [busy,setBusy] = useState(false);
  const complete = useServerFn(completeDelivery);
  useEffect(() => { let canceled = false; const c = canvas.current; if (!c) return; import('signature_pad').then(({ default: Pad }) => { if (canceled) return; pad.current = new Pad(c); }); return () => { canceled = true; pad.current?.off(); }; }, []);
  const submit = async () => { setMsg(''); if (!receiver.trim() || !pad.current || pad.current.isEmpty() || photos.length !== 2) { setMsg('Enter receiver name, sign and attach exactly two cargo photos.'); return; } setBusy(true); try { await complete({ data: { token, receiver, remarks, signature: pad.current.toDataURL(), photos } }); onDone(); } catch (e) { setMsg(e instanceof Error ? e.message : 'Delivery not saved. Retry.'); } finally { setBusy(false); } };
  return <section className="mt-8 space-y-4 border-t border-border pt-6"><h2 className="text-xl font-semibold">Complete delivery</h2><JobField label="Receiver full name" value={receiver} onChange={setReceiver} /><JobField label="Damage / shortages / delivery remarks" value={remarks} onChange={setRemarks} /><p className="text-sm">Receiver signature</p><canvas ref={canvas} width={600} height={220} className="signature-surface w-full max-w-[600px] touch-none rounded-md border border-border" aria-label="Receiver signature canvas" /><Button variant="outline" onClick={() => pad.current?.clear()}>Clear signature</Button><label className="block text-sm">Two cargo photos<input aria-label="Cargo delivery photos" className="field mt-2" type="file" accept="image/png,image/jpeg" multiple onChange={async e => { const files = Array.from(e.target.files ?? []); setMsg(''); if (files.length !== 2) { setMsg('Choose exactly two photos.'); return; } try { setPhotos(await Promise.all(files.map(photoData))); } catch (error) { setMsg(error instanceof Error ? error.message : 'Photos unavailable.'); } }} /></label><div className="grid grid-cols-2 gap-3">{photos.map((p,i) => <img key={i} src={p} alt={`Cargo delivery photo ${i+1}`} className="aspect-video w-full rounded-md object-cover" />)}</div><label className="flex gap-2 text-sm"><input type="checkbox" required id="delivery-confirm" onChange={() => {}} />Receiver confirms delivery and the recorded exceptions.</label><Button disabled={busy} onClick={() => { const checkbox = document.getElementById('delivery-confirm'); if (!(checkbox instanceof HTMLInputElement) || !checkbox.checked) { setMsg('Confirm receiver acknowledgment before submitting.'); return; } submit(); }}>{busy ? 'Saving delivery…' : 'Save signed delivery'}</Button>{msg && <p role="alert" className="text-sm text-hazard">{msg}</p>}</section>;
}
