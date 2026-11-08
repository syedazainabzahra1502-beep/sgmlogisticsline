import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Camera, FileVideo, ScanSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { analyzeDriverMedia, analyzeQuoteMedia } from '@/lib/media.functions';
import type { MediaAnalysis } from '@/lib/media';

const wait = (target: EventTarget, event: string) => new Promise<void>((resolve, reject) => {
  const ok = () => { cleanup(); resolve(); };
  const fail = () => { cleanup(); reject(new Error('This media format could not be opened.')); };
  const cleanup = () => { target.removeEventListener(event, ok); target.removeEventListener('error', fail); };
  target.addEventListener(event, ok, { once: true }); target.addEventListener('error', fail, { once: true });
});

function draw(source: CanvasImageSource, width: number, height: number) {
  if (!width || !height) throw new Error('The media has no readable image.');
  const scale = Math.min(1, 1280 / Math.max(width, height));
  const canvas = document.createElement('canvas'); canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
  const context = canvas.getContext('2d'); if (!context) throw new Error('Media preparation is unavailable.');
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8);
}

async function photoFrame(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Use a JPEG, PNG or WebP photo.');
  if (file.size > 12 * 1024 * 1024) throw new Error('Photos must be under 12 MB.');
  const bitmap = await createImageBitmap(file);
  try { return draw(bitmap, bitmap.width, bitmap.height); } finally { bitmap.close(); }
}

async function videoFrames(file: File) {
  if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)) throw new Error('Use an MP4, WebM or MOV video.');
  if (file.size > 80 * 1024 * 1024) throw new Error('Videos must be under 80 MB.');
  const url = URL.createObjectURL(file); const video = document.createElement('video');
  video.muted = true; video.playsInline = true; video.preload = 'auto'; video.src = url;
  try {
    await wait(video, 'loadedmetadata');
    if (!Number.isFinite(video.duration) || video.duration <= 0 || video.duration > 45) throw new Error('Use a video between 1 and 45 seconds.');
    const frames: string[] = [];
    for (const fraction of [0.1, 0.5, 0.9]) {
      video.currentTime = Math.min(Math.max(0, video.duration * fraction), Math.max(0, video.duration - 0.05));
      await wait(video, 'seeked'); frames.push(draw(video, video.videoWidth, video.videoHeight));
    }
    return frames;
  } finally { video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url); }
}

function List({ title, values, tone = '' }: { title: string; values: string[]; tone?: string }) {
  if (!values.length) return null;
  return <div><p className="label-caps">{title}</p><ul className={`mt-1 list-disc pl-5 text-sm ${tone}`}>{values.map((v, i) => <li key={`${i}-${v}`}>{v}</li>)}</ul></div>;
}

export function MediaAnalyzer({ mode, token, onApply }: { mode: 'quote' | 'driver'; token?: string; onApply?: (analysis: MediaAnalysis) => void }) {
  const quoteCall = useServerFn(analyzeQuoteMedia); const driverCall = useServerFn(analyzeDriverMedia);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [preview, setPreview] = useState(''); const [result, setResult] = useState<MediaAnalysis | null>(null); const [applied, setApplied] = useState(false);
  const analyze = async (file: File) => {
    setBusy(true); setMessage(''); setResult(null); setApplied(false);
    try {
      const isVideo = file.type.startsWith('video/');
      setMessage(isVideo ? 'Sampling three frames from the video…' : 'Preparing photo…');
      const frames = isVideo ? await videoFrames(file) : [await photoFrame(file)];
      setPreview(frames[0] ?? ''); setMessage('AI is reviewing visible details…');
      const response = mode === 'quote' ? await quoteCall({ data: { frames } }) : await driverCall({ data: { token: token ?? '', frames } });
      if (!response.ok) { setMessage(response.error); return; }
      setResult(response.analysis); setMessage(isVideo ? 'Review complete · 3 sampled video frames' : 'Review complete · 1 photo');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Media could not be prepared.'); } finally { setBusy(false); }
  };
  return <div className="space-y-3 rounded-md border border-border p-4">
    <div className="flex items-start gap-3"><ScanSearch className="mt-1 h-5 w-5 shrink-0 text-primary" /><div><p className="font-semibold">{mode === 'quote' ? 'Snap & quote' : 'Cargo photo / video review'}</p><p className="mt-1 text-xs text-muted-foreground">Take a photo or short video on the spot, or upload one. Readable plate details and visible cargo conditions are extracted for your review.</p></div></div>
    <label className={`inline-flex cursor-pointer items-center gap-2 rounded-md border border-primary/50 px-3 py-2 text-sm font-semibold text-primary ${busy ? 'opacity-50' : ''}`}><Camera className="h-4 w-4" />{busy ? 'Reviewing media…' : 'Take / upload photo or video'}<input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" capture="environment" disabled={busy} aria-label={mode === 'quote' ? 'Cargo photo or video for quotation' : 'Cargo photo or video for pre-trip review'} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void analyze(file); }} /></label>
    <p className="text-xs text-muted-foreground">Photos up to 12 MB · videos up to 45 seconds / 80 MB. Video review uses three frames, not audio or continuous footage. Media is not saved automatically.</p>
    {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    {preview && <img src={preview} alt="First cargo frame submitted for AI review" className="max-h-64 w-full rounded-md border border-border object-contain" />}
    {result && <div className="space-y-3 border-t border-border pt-3">
      <p className="text-sm">{result.summary}</p><p className="label-caps">AI confidence · {result.confidence}</p>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">{([['Cargo / equipment', result.cargoType], ['Manufacturer / model', [result.manufacturer, result.model].filter(Boolean).join(' ') || null], ['Serial number', result.serialNumber], ['Explicit weight', result.weightTonnes ? `${result.weightTonnes} t` : null], ['Explicit L × W × H', result.dimensions.lengthM && result.dimensions.widthM && result.dimensions.heightM ? `${result.dimensions.lengthM} × ${result.dimensions.widthM} × ${result.dimensions.heightM} m` : null], ['Preliminary trailer', result.trailerSuggestion]] as const).filter(([, value]) => value).map(([key, value]) => <div key={key}><dt className="text-xs text-muted-foreground">{key}</dt><dd>{value}</dd></div>)}</dl>
      <List title="Readable markings" values={result.readableMarkings} /><List title="Visible condition" values={result.conditionObservations} /><List title="Visible securing observations" values={result.securingObservations} tone="text-pending" /><List title="Recommended next checks" values={result.recommendations} /><List title="Information still needed" values={result.missingInformation} tone="text-pending" />
      {onApply && <Button type="button" variant="outline" size="sm" disabled={applied} onClick={() => { onApply(result); setApplied(true); }}>{applied ? 'Readable details applied' : 'Apply readable details to quote'}</Button>}
      <p className="text-xs text-pending">AI observations only — not a safety inspection, engineering assessment or permit approval. Verify all values against the original plate/documents and physically inspect cargo and lashings.</p>
    </div>}
    {!result && !busy && <FileVideo className="hidden" aria-hidden="true" />}
  </div>;
}
