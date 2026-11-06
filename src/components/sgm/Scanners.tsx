import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { ScanLine, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { scanDocumentFn, saveDriverScan, type DriverScan } from '@/lib/scan.functions';
import type { MulkiyaScan, PermitScan } from '@/lib/scan.server';

const readFile = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });
async function shrink(f: File) {
  if (f.type === 'application/pdf') { if (f.size > 6_000_000) throw new Error('PDF must be under 6 MB.'); return readFile(f); }
  if (!f.type.startsWith('image/')) throw new Error('Use a photo or PDF.');
  const img = await createImageBitmap(f); const k = Math.min(1, 1800 / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height); img.close(); return c.toDataURL('image/jpeg', 0.85);
}

/** Dispatcher OCR button: photo/PDF of a permit or Mulkiya → AI-extracted fields handed to the caller for review. */
export function DocScanButton<K extends 'permit' | 'mulkiya'>({ kind, label, onFields }: { kind: K; label: string; onFields: (f: K extends 'permit' ? PermitScan : MulkiyaScan) => void }) {
  const scan = useServerFn(scanDocumentFn);
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState('');
  return <label className="inline-flex cursor-pointer flex-wrap items-center gap-2 text-sm">
    <span className={`inline-flex items-center gap-2 rounded-md border border-primary/50 px-3 py-1.5 font-semibold text-primary ${busy ? 'opacity-60' : ''}`}><ScanLine className="h-4 w-4" />{busy ? 'Reading document…' : label}</span>
    <input type="file" className="sr-only" accept="image/*,application/pdf" capture="environment" disabled={busy} aria-label={label} onChange={async e => {
      const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; setMsg(''); setBusy(true);
      try { const r = await scan({ data: { kind, file: await shrink(f) } }); if (!r.ok) setMsg(r.error); else { onFields(r.fields as never); setMsg('Fields filled from scan. Check them against the original before saving.'); } }
      catch (err) { setMsg(err instanceof Error ? err.message : 'Scan failed.'); } finally { setBusy(false); }
    }} />
    {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
  </label>;
}

/** Live camera barcode/QR reader (ZXing). Calls onCode once per distinct read. */
export function CameraScanner({ onCode, onClose }: { onCode: (v: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null); const [err, setErr] = useState('');
  useEffect(() => {
    let stop: (() => void) | undefined; let done = false;
    import('@zxing/browser').then(async ({ BrowserMultiFormatReader }) => {
      if (done || !video.current) return;
      try {
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoDevice(undefined, video.current, (res) => { if (res && !done) { done = true; controls.stop(); onCode(res.getText()); } });
        stop = () => controls.stop(); if (done) controls.stop();
      } catch { setErr('Camera unavailable. Allow camera access or type the code.'); }
    });
    return () => { done = true; stop?.(); };
  }, [onCode]);
  return <div className="space-y-2"><video ref={video} className="aspect-video w-full rounded-md border border-border bg-muted object-cover" muted playsInline aria-label="Barcode camera" />{err && <p className="text-sm text-hazard">{err}</p>}<Button variant="outline" onClick={onClose}>Close camera</Button></div>;
}

const KINDS = ['Container no.', 'Seal no.', 'e-Token', 'Equipment barcode', 'Other'] as const;
const position = () => new Promise<{ lat: number | null; lng: number | null }>(res => { if (!navigator.geolocation) return res({ lat: null, lng: null }); navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lng: p.coords.longitude }), () => res({ lat: null, lng: null }), { timeout: 6000, maximumAge: 60000 }); });

/** Driver pass panel: scan container/seal/e-Token codes and log them to the job with time and GPS. */
export function DriverScanPanel({ token, initial }: { token: string; initial: DriverScan[] }) {
  const save = useServerFn(saveDriverScan);
  const [kind, setKind] = useState<(typeof KINDS)[number]>('Container no.'); const [value, setValue] = useState(''); const [cam, setCam] = useState(false);
  const [scans, setScans] = useState(initial); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async () => { setMsg(''); if (value.trim().length < 2) return setMsg('Scan or type a code first.'); setBusy(true); try { const p = await position(); const r = await save({ data: { token, kind, value: value.trim(), ...p } }); setScans(r.scans); setValue(''); setMsg('Saved to job log.'); } catch (e) { setMsg(e instanceof Error ? e.message : 'Not saved.'); } finally { setBusy(false); } };
  return <section className="mt-8 space-y-3 border-t border-border pt-6">
    <h2 className="text-xl font-semibold">Scan container, seal or e-Token</h2>
    <div className="grid gap-2 sm:grid-cols-[180px_1fr]"><select aria-label="Scan type" className="field" value={kind} onChange={e => setKind(e.target.value as typeof kind)}>{KINDS.map(k => <option key={k}>{k}</option>)}</select><input aria-label="Scanned code" className="field font-mono" placeholder="e.g. MSCU1234567" value={value} onChange={e => setValue(e.target.value)} /></div>
    {cam ? <CameraScanner onCode={v => { setValue(v); setCam(false); }} onClose={() => setCam(false)} /> : <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setCam(true)}><Camera />Open camera scanner</Button><Button disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Save to job log'}</Button></div>}
    {msg && <p role="status" className="text-sm text-muted-foreground">{msg}</p>}
    {scans.length > 0 && <ul className="divide-y divide-border text-sm">{scans.slice().reverse().map((s, i) => <li key={i} className="py-2"><span className="text-muted-foreground">{s.kind}</span> · <span className="font-mono">{s.value}</span><span className="block text-xs text-muted-foreground">{new Date(s.at).toLocaleString('en-GB', { timeZone: 'Asia/Dubai' })} GST{s.lat !== null ? ` · ${s.lat.toFixed(5)}, ${s.lng?.toFixed(5)}` : ' · no GPS'}</span></li>)}</ul>}
  </section>;
}
