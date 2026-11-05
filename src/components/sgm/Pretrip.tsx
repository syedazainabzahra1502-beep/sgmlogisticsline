import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { PRETRIP, pretripComplete } from '@/lib/operations';
import { savePretrip } from '@/lib/operations.functions';

export function PretripChecklist({ token, onDone }: { token: string; onDone: () => void }) {
  const save = useServerFn(savePretrip);
  const [checks, setChecks] = useState<boolean[]>(PRETRIP.map(() => false));
  const [name, setName] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const ok = pretripComplete(checks) && name.trim().length >= 2;
  return <section className="mt-8 border-t border-border pt-6">
    <h2 className="text-lg font-semibold">Pre-trip & lashing checklist</h2>
    <p className="text-sm text-muted-foreground">Required before delivery can be recorded. Tick only what you have physically checked.</p>
    <div className="mt-4 space-y-3">{PRETRIP.map((item, i) => <label key={item} className="flex items-start gap-3 text-base"><input type="checkbox" className="mt-1 h-5 w-5" checked={checks[i]} onChange={e => setChecks(checks.map((c, j) => j === i ? e.target.checked : c))} />{item}</label>)}</div>
    <label className="mt-4 block text-sm">Driver name<input className="field mt-1" value={name} onChange={e => setName(e.target.value)} /></label>
    {err && <p role="alert" className="mt-2 text-sm text-hazard">{err}</p>}
    <button disabled={!ok || busy} className="mt-4 w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50" onClick={async () => { setBusy(true); setErr(''); try { await save({ data: { token, name, checks: checks.map(() => true as const) } }); onDone(); } catch (e) { setErr(e instanceof Error ? e.message : 'Not saved.'); } finally { setBusy(false); } }}>{ok ? 'Confirm checklist' : `${checks.filter(Boolean).length}/${PRETRIP.length} checked`}</button>
  </section>;
}
