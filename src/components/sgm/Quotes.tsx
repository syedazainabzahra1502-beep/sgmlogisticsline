import { useCallback, useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { submitQuote } from '@/lib/operations.functions';
import { loadClass, routeHazards } from '@/lib/operations';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Header } from './Commerce';

const empty = { company: '', contact_name: '', email: '', phone: '', origin: '', destination: '', cargo: '', weight: 0, length: 0, width: 0, height: 0, preferred_date: '', notes: '', website: '' };
export function QuoteRequest() {
  const send = useServerFn(submitQuote);
  const [f, setF] = useState(empty); const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle'); const [err, setErr] = useState('');
  const cls = loadClass(f); const flags = routeHazards(f);
  const text = (k: keyof typeof empty, label: string, type = 'text') => <label className="block"><span className="label-caps">{label}</span><input required={k !== 'notes' && k !== 'preferred_date'} type={type} min={type === 'number' ? 0 : undefined} step={type === 'number' ? 'any' : undefined} className="field mt-1" value={String(f[k])} onChange={e => setF({ ...f, [k]: type === 'number' ? Number(e.target.value) : e.target.value })} /></label>;
  if (state === 'sent') return <section className="panel p-5 lg:col-span-2"><Header n="05" title="Request a Heavy-Haul Quote" /><p className="mt-4 text-cleared">Request received. SGM operations will reply by email or phone. For urgent moves call {'+971 55 998 6509'}.</p><button className="mt-3 text-sm underline" onClick={() => { setF(empty); setState('idle'); }}>Send another request</button></section>;
  return <section className="panel p-5 lg:col-span-2">
    <Header n="05" title="Request a Heavy-Haul Quote" />
    <form className="mt-4 space-y-4" onSubmit={async e => { e.preventDefault(); setErr(''); setState('busy'); try { await send({ data: f }); setState('sent'); } catch { setErr('Please check every required field (weight above 0, valid email) and retry.'); setState('idle'); } }}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{text('company', 'Company')}{text('contact_name', 'Contact name')}{text('email', 'Email', 'email')}{text('phone', 'Phone', 'tel')}</div>
      <div className="grid gap-3 sm:grid-cols-3">{text('origin', 'Pickup location')}{text('destination', 'Delivery location')}{text('preferred_date', 'Preferred date', 'date')}</div>
      {text('cargo', 'Cargo description')}
      <div className="grid gap-3 sm:grid-cols-4">{text('weight', 'Weight (t)', 'number')}{text('length', 'Length (m)', 'number')}{text('width', 'Width (m)', 'number')}{text('height', 'Height (m)', 'number')}</div>
      {text('notes', 'Notes (optional)')}
      <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={f.website} onChange={e => setF({ ...f, website: e.target.value })} />
      {cls && <div className="border-l-2 border-primary pl-3 text-sm"><p className="font-semibold">{cls}</p>{flags.map(x => <p key={x} className="text-pending">{x}</p>)}<p className="text-xs text-muted-foreground">Indicative only — final equipment and permits are confirmed after SGM's route survey.</p></div>}
      {err && <p role="alert" className="text-sm text-hazard">{err}</p>}
      <button disabled={state === 'busy'} className="rounded-md bg-primary px-5 py-2 font-semibold text-primary-foreground disabled:opacity-50">{state === 'busy' ? 'Sending…' : 'Send quote request'}</button>
    </form>
  </section>;
}

type Q = Tables<'quote_requests'>;
export function QuoteInbox({ onConverted }: { onConverted: () => void }) {
  const [rows, setRows] = useState<Q[]>([]); const [msg, setMsg] = useState('');
  const load = useCallback(async () => { const r = await supabase.from('quote_requests').select('*').order('created_at', { ascending: false }).limit(50); setRows(r.data ?? []); }, []);
  useEffect(() => { void load(); }, [load]);
  const convert = async (q: Q) => {
    const details = { cargo: q.cargo, weight: Number(q.weight), length: Number(q.length), width: Number(q.width), height: Number(q.height), consignee: q.company, notes: `Contact: ${q.contact_name} · ${q.email} · ${q.phone}${q.preferred_date ? ` · Preferred ${q.preferred_date}` : ''}${q.notes ? `\n${q.notes}` : ''}` };
    const j = await supabase.from('operations_jobs').insert({ reference: `SGM-${Date.now().toString(36).toUpperCase()}`, origin: q.origin, destination: q.destination, customer: q.company, details }).select('id').single();
    if (j.error) { setMsg('Job not created.'); return; }
    await supabase.from('quote_requests').update({ status: 'converted', job_id: j.data.id }).eq('id', q.id);
    setMsg(`Job created for ${q.company}. Open it in the Operations Suite.`); await load(); onConverted();
  };
  const decline = async (q: Q) => { await supabase.from('quote_requests').update({ status: 'declined' }).eq('id', q.id); await load(); };
  const open = rows.filter(r => r.status === 'new');
  return <section className="panel p-5 lg:col-span-2">
    <Header n="02" title={`Inbound Quote Requests · ${open.length} new`} />
    {msg && <p role="status" className="mt-2 text-sm">{msg}</p>}
    {rows.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No requests yet. Requests from the public quote form appear here (only for the {'info@sgmlogisticsline.com'} dispatcher account).</p> :
    <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="label-caps"><tr><th className="py-2">Received (GST)</th><th>Client</th><th>Route</th><th>Cargo</th><th>Indicative</th><th /></tr></thead><tbody className="divide-y divide-border">{rows.map(q => <tr key={q.id} className="align-top"><td className="py-3 pr-3 font-mono text-xs">{new Date(q.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Dubai' })}</td><td className="pr-3">{q.company}<br /><span className="text-xs text-muted-foreground">{q.contact_name} · {q.phone}<br />{q.email}</span></td><td className="pr-3">{q.origin} → {q.destination}</td><td className="pr-3">{q.cargo}<br /><span className="font-mono text-xs">{Number(q.weight)} t · {Number(q.length)}×{Number(q.width)}×{Number(q.height)} m</span></td><td className="pr-3 text-xs">{loadClass({ weight: Number(q.weight), length: Number(q.length), width: Number(q.width), height: Number(q.height) })}</td><td className="whitespace-nowrap">{q.status === 'new' ? <><button className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground" onClick={() => void convert(q)}>Convert to job</button> <button className="text-xs underline" onClick={() => void decline(q)}>Decline</button></> : <span className="label-caps">{q.status}</span>}</td></tr>)}</tbody></table></div>}
  </section>;
}
