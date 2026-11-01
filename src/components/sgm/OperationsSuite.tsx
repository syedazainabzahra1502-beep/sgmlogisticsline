import { useEffect, useState, useCallback } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus, Save, Download, Share2, FileUp, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { DetailsSchema, STAGES, stageLabel, readDetails, documents, axlePlan, exposure, weatherReview, driverPacket, type Job, type Details } from '@/lib/operations';
import { jobPDF } from '@/lib/operations-pdf';
import { SERVICES, cartTotals, fmt } from '@/lib/sgm';
import { JobField, DetailsFields, gst } from './JobFields';
import { useCart } from './Commerce';

const tabs = ['Job desk', 'Engineering & route', 'Port & weather', 'Quotation', 'Documents & delivery'] as const;
export function OperationsSuite({ signedIn }: { signedIn: boolean }) {
  const [jobs, setJobs] = useState<Job[]>([]); const [selected, setSelected] = useState('');
  const [tab, setTab] = useState<(typeof tabs)[number]>('Job desk');
  const [d, setD] = useState<Details>(() => DetailsSchema.parse({}));
  const [base, setBase] = useState({ reference: '', origin: '', destination: '', customer: '' });
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [dirty, setDirty] = useState(false);
  const [kind, setKind] = useState('RTA ROW permit'); const [now, setNow] = useState(0); const [qr, setQr] = useState('');
  const { add } = useCart();
  const job = jobs.find(j => j.id === selected);
  const load = useCallback(async () => {
    if (!signedIn) { setJobs([]); return; }
    const r = await supabase.from('operations_jobs').select('*').order('created_at', { ascending: false });
    if (r.error) throw new Error('Jobs could not be loaded.');
    setJobs(r.data ?? []);
  }, [signedIn]);
  useEffect(() => { load().catch(e => setMessage(e.message)); }, [load]);
  useEffect(() => { setNow(Date.now()); const i = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(i); }, []);
  const draft = (v: Details) => { setD(v); setDirty(true); };
  const select = (j?: Job) => {
    if (dirty && !window.confirm('Discard unsaved job changes?')) return;
    setSelected(j?.id ?? ''); setD(j ? readDetails(j) : DetailsSchema.parse({}));
    setBase(j ? { reference: j.reference, origin: j.origin, destination: j.destination, customer: j.customer } : { reference: `SGM-${Date.now().toString(36).toUpperCase()}`, origin: '', destination: '', customer: '' });
    setDirty(false); setMessage(''); setQr('');
  };
  const run = async (fn: () => Promise<void>) => { setBusy(true); setMessage(''); try { await fn(); } catch (e) { setMessage(e instanceof Error ? e.message : 'Action failed. Please retry.'); } finally { setBusy(false); } };
  const save = async () => {
    if (!base.reference.trim() || !base.origin.trim() || !base.destination.trim()) throw new Error('Enter a job reference, origin and destination.');
    const parsed = DetailsSchema.parse(d); const values = { ...base, details: parsed, updated_at: new Date().toISOString() };
    const r = job ? await supabase.from('operations_jobs').update(values).eq('id', job.id).select().single() : await supabase.from('operations_jobs').insert(values).select().single();
    if (r.error || !r.data) throw new Error('Job was not saved. Please retry.');
    await load(); setSelected(r.data.id); setDirty(false); setMessage('Job saved.');
  };
  const clean = () => { if (!job) throw new Error('Save the job first.'); if (dirty) throw new Error('Save your changes first.'); return job; };
  const links = (j: Job) => ({ client: `${window.location.origin}/track/${j.client_token}`, driver: `${window.location.origin}/driver/${j.driver_token}` });
  const share = async (driver: boolean, whatsapp = false) => {
    const j = clean();
    if (!j.sharing_enabled || Date.parse(j.share_expires_at) < Date.now()) throw new Error('Enable sharing first.');
    const link = driver ? links(j).driver : links(j).client;
    if (whatsapp) { const phone = d.driverPhone.replace(/\D/g, ''); window.open(`https://wa.me/${phone}?text=${encodeURIComponent(driverPacket(j, d, link))}`, '_blank', 'noopener,noreferrer'); }
    else { await navigator.clipboard.writeText(link); const QR = await import('qrcode'); setQr(await QR.toDataURL(link)); setMessage(`${driver ? 'Driver pass' : 'Client tracking'} link copied. Anyone with this link has access until expiry.`); }
  };
  const updateStage = async (stage: string) => {
    const j = clean(); if (stage === 'delivered') throw new Error('Complete the signed delivery record on the driver pass.');
    const history = Array.isArray(j.milestones) ? j.milestones : [];
    const r = await supabase.from('operations_jobs').update({ stage, milestones: [...history, { stage, at: new Date().toISOString() }], updated_at: new Date().toISOString() }).eq('id', j.id);
    if (r.error) throw new Error('Status update failed.'); await load(); setMessage('Milestone recorded.');
  };
  const upload = async (file: File) => {
    const j = clean();
    if (file.size > 10 * 1024 * 1024 || !['application/pdf','image/jpeg','image/png'].includes(file.type)) throw new Error('Choose a PDF, PNG or JPEG under 10 MB.');
    const path = `${j.user_id}/${j.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.\-]/g,'_')}`;
    const r = await supabase.storage.from('dispatch-documents').upload(path, file); if (r.error) throw new Error('Document upload failed.');
    const files = [...documents(j.documents), { path, name: file.name, kind, at: new Date().toISOString() }];
    const saved = await supabase.from('operations_jobs').update({ documents: files }).eq('id', j.id);
    if (saved.error) { await supabase.storage.from('dispatch-documents').remove([path]); throw new Error('Document attachment failed.'); }
    await load(); setMessage('Document attached privately.');
  };
  const fileLink = async (path: string) => { const r = await supabase.storage.from('dispatch-documents').createSignedUrl(path, 300); if (!r.data) throw new Error('File unavailable.'); window.open(r.data.signedUrl, '_blank', 'noopener,noreferrer'); };
  const plan = axlePlan(d.weight, d.tare, d.lineLimit, d.plannedLines);
  const costs = [exposure(gst(d.freeUntil), d.dailyStorage, now), exposure(gst(d.detentionUntil), d.dailyDetention, now)];
  const weather = now ? weatherReview({ ...d, weatherTime: gst(d.weatherTime) }, now) : 'unverified';
  const totals = cartTotals([...d.items, ...(d.mobilization ? [{ id: 'mob', name: 'Mobilization', price: d.mobilization, qty: 1, unit: '' }] : [])]);
  return <section className="min-w-0 border-y border-border bg-background py-6" id="operations">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="label-caps text-primary">SGM / Field Operations</p><h1 className="mt-1 text-2xl font-semibold">UAE Operations Suite</h1></div><div className="flex gap-2"><Button variant="outline" disabled={busy || !signedIn} onClick={() => run(load)} aria-label="Refresh jobs" title="Refresh jobs"><RefreshCw /></Button><Button onClick={() => select()} disabled={!signedIn}><Plus />New job</Button></div></div>
    {!signedIn ? <p className="py-6 text-muted-foreground"><Link to="/auth" className="text-primary underline">Dispatcher sign in</Link> to manage jobs.</p> : <>
    <div className="my-5 grid gap-3 md:grid-cols-[280px_1fr]">
      <label className="text-xs text-muted-foreground">Saved job<select aria-label="Saved job" value={selected} onChange={e => select(jobs.find(j => j.id === e.target.value))} className="field mt-1"><option value="">New job</option>{jobs.map(j => <option key={j.id} value={j.id}>{j.reference} · {stageLabel(j.stage)}</option>)}</select></label>
      <div className="flex flex-wrap items-end justify-between gap-2"><span className="text-sm text-muted-foreground">{jobs.length} jobs · {job ? stageLabel(job.stage) : 'Unsaved'}{dirty ? ' · Unsaved changes' : ''}</span><Button disabled={busy} onClick={() => run(save)}><Save />Save job</Button></div>
    </div>
    <div className="flex flex-wrap gap-1 border-b border-border pb-2" role="tablist" aria-label="Operations views">{tabs.map(t => <Button key={t} role="tab" aria-selected={tab === t} variant={tab === t ? 'secondary' : 'ghost'} size="sm" onClick={() => setTab(t)}>{t}</Button>)}</div>
    {message && <p role="status" className="my-3 break-words border-l-2 border-primary pl-3 text-sm">{message}</p>}
    <div className="space-y-5 py-5" role="tabpanel">
    {tab === 'Job desk' && <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(['reference','origin','destination','customer'] as const).map(k => <JobField key={k} label={k === 'reference' ? 'Job reference' : k === 'customer' ? 'Customer legal name' : stageLabel(k)} value={base[k]} onChange={v => { setBase({ ...base, [k]: v }); setDirty(true); }} />)}</div>
      <DetailsFields d={d} set={draft} fields={ [['cargo','Cargo description'],['pickup','Pickup (GST)','datetime-local'],['endTime','Transit end (GST)','datetime-local'],['consignee','Consignee'],['bl','BL / container reference'],['driverPhone','Driver WhatsApp (international)'],['escortPhone','Escort lead phone'],['rta','Dubai RTA ROW permit & expiry'],['dot','Abu Dhabi permit & expiry'],['token','Gate 4 e-Token & appointment'],['customs','JAFZA / customs clearance reference']] } />
      <JobField label="Transport notes" value={d.notes} onChange={v => draft({ ...d, notes: v })} />
      <div className="flex flex-wrap items-center gap-3"><label className="text-xs text-muted-foreground">Current milestone<select aria-label="Current milestone" className="field mt-1" disabled={!job || dirty || busy || job.stage === 'delivered'} value={job?.stage ?? 'planned'} onChange={e => run(() => updateStage(e.target.value))}>{STAGES.map(s => <option key={s} value={s} disabled={s === 'delivered'}>{stageLabel(s)}</option>)}</select></label><Button variant="outline" disabled={!job || busy} onClick={() => run(async () => { const j = clean(); const r = await supabase.from('operations_jobs').update({ sharing_enabled: !j.sharing_enabled, share_expires_at: new Date(Date.now() + 7 * 86400000).toISOString(), client_token: crypto.randomUUID(), driver_token: crypto.randomUUID() }).eq('id', j.id); if (r.error) throw new Error('Sharing update failed.'); await load(); setMessage(j.sharing_enabled ? 'Links revoked.' : 'Sharing enabled for 7 days.'); })}>{job?.sharing_enabled ? 'Revoke shared links' : 'Enable 7-day sharing'}</Button></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => run(() => share(true, true))} disabled={!job || busy}><Share2 />WhatsApp driver</Button><Button variant="outline" onClick={() => run(() => share(false))} disabled={!job || busy}>Copy client link</Button><Button variant="outline" onClick={() => run(() => share(true))} disabled={!job || busy}>Copy driver pass</Button><Button variant="outline" onClick={() => run(async () => { const j = clean(); await jobPDF('packet', j, d, j.sharing_enabled ? links(j).driver : ''); })} disabled={!job || busy}><Download />Dispatch PDF</Button></div>
      {qr && <img src={qr} width="160" height="160" alt="Shared dispatch QR code" />}
      {job && <div className="text-xs text-muted-foreground">Sharing: {job.sharing_enabled ? `expires ${new Date(job.share_expires_at).toLocaleString('en-GB', { timeZone: 'Asia/Dubai' })} GST` : 'off'} · Client links show milestones only. Driver links also expose permits and accept delivery proof.</div>}
    </>}
    {tab === 'Engineering & route' && <>
      <h2 className="font-semibold">Axle-line planning</h2><DetailsFields d={d} set={draft} fields={ [['weight','Cargo weight (t)','number'],['tare','Trailer tare (t)','number'],['length','Overall length (m)','number'],['width','Overall width (m)','number'],['height','Overall loaded height (m)','number'],['lineLimit','Approved tonnes per axle line','number'],['plannedLines','Planned axle lines','number']] } />
      <p className="text-xs text-pending">Planning estimate only. Enter the limit from the equipment specification and authority-approved route. Equal load distribution is not bridge certification; tractor loads, axle spacing and center of gravity require engineering review.</p>
      {plan ? <dl className="grid gap-4 border-y border-border py-4 sm:grid-cols-3"><div><dt className="label-caps">Trailer gross</dt><dd className="font-mono text-xl">{plan.gross.toFixed(1)} t</dd></div><div><dt className="label-caps">Minimum lines (estimate)</dt><dd className="font-mono text-xl">{plan.required}</dd></div><div><dt className="label-caps">Estimated per line</dt><dd className={`font-mono text-xl ${plan.sufficient ? 'text-cleared' : 'text-hazard'}`}>{plan.perLine?.toFixed(2) ?? '—'} t · {plan.sufficient ? 'Within entered limit' : 'More lines needed'}</dd></div></dl> : <p className="text-sm text-muted-foreground">Awaiting cargo weight and approved axle-line limit.</p>}
      <Button variant="outline" onClick={() => { const s = SERVICES.find(s => s.id === 'trailer-12'); if (s) add({ id: s.id, name: s.name, price: s.price, unit: s.unit }); }}>Add 12-axle trailer booking · AED 9,000</Button>
      <h2 className="font-semibold">Authority & escort review</h2>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="label-caps"><tr><th className="py-2">Authority / check</th><th>Evidence</th><th>Review</th></tr></thead><tbody className="divide-y divide-border">{[['Dubai RTA ROW',d.rta],['Abu Dhabi transport authority',d.dot],['Dubai Trade Gate 4',d.token],['JAFZA / Dubai Customs',d.customs]].map(([name,value]) => <tr key={name}><td className="py-3 pr-3">{name}</td><td className="pr-3">{value || 'Not recorded'}</td><td className="text-pending">Verify original approval</td></tr>)}</tbody></table></div>
      {([['escortVerified','Escort category, notice period and border handover confirmed'],['utilitiesVerified','Overhead utilities and loaded-height clearance confirmed'],['routeVerified','Approved route, WIM/axle limits and bridge clearances reviewed']] as const).map(([k,l]) => <label key={k} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={d[k]} onChange={e => draft({ ...d, [k]: e.target.checked })} />{l}</label>)}
      <JobField label="Approved corridor / clearance notes" value={d.route} onChange={v => draft({ ...d, route: v })} />
      <p className="text-xs text-muted-foreground">E11, E311, E611 and E77 are route candidates, not automatic permissions. Record permitted corridor, truck restrictions, bridge/gantry clearance and weighbridge requirements from the actual survey and permit. Escort and utility thresholds vary by authority and move.</p>
    </>}
    {tab === 'Port & weather' && <>
      <h2 className="font-semibold">Terminal storage & line detention</h2><DetailsFields d={d} set={draft} fields={ [['freeUntil','Terminal free-time ends (GST)','datetime-local'],['dailyStorage','Terminal daily rate (AED)','number'],['detentionUntil','Line detention free-time ends (GST)','datetime-local'],['dailyDetention','Detention daily rate (AED)','number']] } />
      <div className="grid gap-4 sm:grid-cols-2">{costs.map((c,i) => <div key={i} className="border-l-2 border-primary pl-4"><p className="label-caps">{i ? 'Line detention' : 'Terminal storage'}</p><p className="mt-2 font-mono text-xl">{c ? c.hours >= 0 ? `${c.hours.toFixed(1)} hours left` : `${c.days} chargeable days` : 'Deadline not recorded'}</p><p className="text-sm text-pending">Estimated accrued: {fmt(c?.cost ?? 0)}</p></div>)}</div>
      <p className="text-xs text-muted-foreground">Enter contracted deadlines and rates. Estimate bills each started 24-hour day after free time; terminal calendars, tiered tariffs, holidays and returned equipment may change the actual charge.</p>
      <h2 className="border-t border-border pt-5 font-semibold">Corridor weather review · Manual observations</h2><DetailsFields d={d} set={draft} fields={ [['wind','Wind (knots)','number'],['visibility','Visibility (m)','number'],['windLimit','Job wind stop limit (knots)','number'],['visibilityLimit','Job minimum visibility (m)','number'],['weatherSource','Observation / authority bulletin source'],['weatherTime','Observed (GST)','datetime-local']] } />
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={d.weatherHold} onChange={e => draft({ ...d, weatherHold: e.target.checked })} />Authority restriction / operational hold reported</label>
      <p className={`font-semibold ${weather === 'hold' ? 'text-hazard' : weather === 'reviewed' ? 'text-cleared' : 'text-pending'}`}>{weather === 'hold' ? 'HOLD — entered limit exceeded or restriction reported' : weather === 'reviewed' ? 'Within entered limits — authority confirmation still required' : weather === 'stale' ? 'Observation expired — refresh weather review' : 'Weather unverified'}</p><a href="https://www.ncm.gov.ae/" target="_blank" rel="noreferrer" className="text-sm text-primary underline">National Center of Meteorology</a>
      <p className="text-xs text-muted-foreground">No live NCM or curfew feed is connected. Observations expire after one hour. Use actual permit/equipment wind limits and current police or authority restrictions.</p>
    </>}
    {tab === 'Quotation' && <>
      <h2 className="font-semibold">Commercial quotation</h2><DetailsFields d={d} set={draft} fields={ [['quoteDays','Quote validity (days)','number'],['mobilization','Mobilization (AED)','number'],['trn','Customer TRN (optional)']] } />
      <div className="divide-y divide-border">{SERVICES.map(s => <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><span className="text-sm">{s.name} · {fmt(s.price)}</span><Button size="sm" variant="outline" onClick={() => draft({ ...d, items: d.items.some(i => i.id === s.id) ? d.items.map(i => i.id === s.id ? { ...i, qty: i.qty + 1 } : i) : [...d.items, { id: s.id, name: s.name, price: s.price, qty: 1, unit: s.unit }] })}><Plus />Add line</Button></div>)}</div>
      {d.items.map(i => <div className="grid items-end gap-2 sm:grid-cols-[1fr_100px_140px_36px]" key={i.id}><p className="text-sm">{i.name}</p><JobField label={`Quantity ${i.id}`} type="number" value={i.qty} onChange={v => draft({ ...d, items: d.items.map(x => x.id === i.id ? { ...x, qty: Math.max(1, Math.floor(Number(v))) } : x) })} /><JobField label={`Unit AED ${i.id}`} type="number" value={i.price} onChange={v => draft({ ...d, items: d.items.map(x => x.id === i.id ? { ...x, price: Number(v) } : x) })} /><Button variant="ghost" size="icon" aria-label={`Remove ${i.name}`} onClick={() => draft({ ...d, items: d.items.filter(x => x.id !== i.id) })}><Trash2 /></Button></div>)}
      <JobField label="Commercial terms / waiting & cancellation agreement" value={d.quoteTerms} onChange={v => draft({ ...d, quoteTerms: v })} />
      <p className="font-mono">Subtotal {fmt(totals.subtotal)} · VAT estimate {fmt(totals.vat)} · Total {fmt(totals.total)}</p>
      <Button disabled={!job || busy || !d.items.length} onClick={() => run(async () => { await jobPDF('quote', clean(), d); })}><Download />Quotation PDF</Button>
      <p className="text-xs text-muted-foreground">No stamp or signature is fabricated. Quotation is not a tax invoice. The uploaded certificate establishes corporate tax registration, not VAT registration; verify VAT registration before issuing a tax invoice. Trailer price is an estimate; edit negotiated rates.</p>
    </>}
    {tab === 'Documents & delivery' && <>
      <h2 className="font-semibold">Private document vault</h2><div className="flex flex-wrap items-end gap-3"><label className="text-xs text-muted-foreground">Document type<select aria-label="Document type" className="field mt-1" value={kind} onChange={e => setKind(e.target.value)}>{['RTA ROW permit','Abu Dhabi permit','Dubai Trade e-Token','Delivery order / customs','Route survey','Other'].map(k => <option key={k}>{k}</option>)}</select></label><Button asChild variant="outline" disabled={!job || busy}><label className="cursor-pointer"><FileUp />Attach document<input aria-label="Attach document" type="file" accept="application/pdf,image/png,image/jpeg" className="hidden" disabled={!job || busy} onChange={e => { const f = e.target.files?.[0]; if (f) run(() => upload(f)); e.target.value = ''; }} /></label></Button></div>
      {!job ? <p className="text-muted-foreground text-sm">Save a job to attach documents.</p> : documents(job.documents).length === 0 ? <p className="text-muted-foreground text-sm">No documents attached.</p> : documents(job.documents).map(f => <div key={f.path} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-3"><div className="min-w-0"><p className="break-all text-sm">{f.name}</p><p className="text-xs text-muted-foreground">{f.kind}</p></div><Button variant="outline" size="sm" onClick={() => run(() => fileLink(f.path))}>Open</Button></div>)}
      <h2 className="border-t border-border pt-5 font-semibold">Delivery closeout</h2><p className="text-sm text-muted-foreground">{job?.pod ? 'Delivery proof recorded. Receiver signature and cargo photos stored privately.' : 'Awaiting signed delivery proof on the driver pass.'}</p>
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!job || busy} onClick={() => run(async () => { const j = clean(); if (!j.sharing_enabled) throw new Error('Enable sharing in Job desk.'); window.open(links(j).driver, '_blank', 'noopener,noreferrer'); })}>Open driver pass</Button><Button variant="outline" disabled={!job?.pod || busy} onClick={() => run(async () => jobPDF('pod', clean(), d))}><Download />e-POD PDF</Button></div>
      <p className="text-xs text-muted-foreground">Signed e-POD is stored with this job. Automatic client email and live payment collection are not connected. Existing invoice downloads remain available in the dispatch basket.</p>
    </>}
    </div></>}
  </section>;
}
