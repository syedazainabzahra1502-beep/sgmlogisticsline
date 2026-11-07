import { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { daysLeft, expiryState, type FleetAsset } from '@/lib/fleet';
import { Header } from './Commerce';
import { DocScanButton } from './Scanners';

const tone = { expired: 'text-hazard border-hazard/40 bg-hazard/10', due: 'text-pending border-pending/40 bg-pending/10', valid: 'text-cleared border-cleared/40 bg-cleared/10', unknown: 'text-muted-foreground border-border' };

export function useFleet(signedIn: boolean) {
  const [items, setItems] = useState<FleetAsset[]>([]);
  const load = useCallback(async () => {
    if (!signedIn) { setItems([]); return; }
    const r = await supabase.from('fleet_assets').select('*').order('expires_on', { ascending: true, nullsFirst: false });
    if (!r.error) setItems(r.data ?? []);
  }, [signedIn]);
  useEffect(() => { void load(); }, [load]);
  return { items, load };
}

export function FleetModule({ signedIn, fleet }: { signedIn: boolean; fleet: ReturnType<typeof useFleet> }) {
  const empty = { kind: 'driver', name: '', phone: '', plate: '', document: '', expires_on: '' };
  const [f, setF] = useState(empty);
  const [msg, setMsg] = useState('');
  const [now, setNow] = useState(0);
  useEffect(() => setNow(Date.now()), []);
  if (!signedIn) return null;
  const add = async () => {
    if (!f.name.trim()) return setMsg('Enter a driver name or vehicle description.');
    const r = await supabase.from('fleet_assets').insert({ ...f, expires_on: f.expires_on || null });
    if (r.error) return setMsg('Could not save. Please retry.');
    setF(empty); setMsg('Saved.'); await fleet.load();
  };
  const del = async (id: string) => { await supabase.from('fleet_assets').delete().eq('id', id); await fleet.load(); };
  const alerts = fleet.items.filter((a) => ['expired', 'due'].includes(expiryState(a.expires_on, now))).length;
  return (
    <section className="panel p-5">
      <Header n="03" title="Driver & Fleet Directory · Gate Pass and Mulkiya Expiry" />
      <p className="mt-1 text-sm text-muted-foreground">{fleet.items.length} records · {alerts} need renewal within 30 days or are expired.</p>
      <div className="mt-3"><DocScanButton kind="mulkiya" label="Scan Mulkiya / licence / gate pass" onFields={(m) => setF((cur) => ({ ...cur, kind: m.plate || m.chassisVin ? 'vehicle' : 'driver', name: [m.vehicleMake, m.ownerOrHolder].filter(Boolean).join(' · ') || cur.name, plate: m.plate ?? cur.plate, document: [m.documentNumber, m.chassisVin && `VIN ${m.chassisVin}`].filter(Boolean).join(' · ') || cur.document, expires_on: m.expiry && /^\d{4}-\d{2}-\d{2}$/.test(m.expiry) ? m.expiry : cur.expires_on }))} /></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <select aria-label="Type" className="field" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="driver">Driver</option><option value="vehicle">Truck / trailer</option></select>
        <input className="field" placeholder={f.kind === 'driver' ? 'Driver name' : 'Prime mover / trailer'} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className="field" placeholder={f.kind === 'driver' ? 'WhatsApp +9715…' : 'Assigned driver phone'} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <input className="field" placeholder="Plate no. (e.g. DXB K 12345)" value={f.plate} onChange={(e) => setF({ ...f, plate: e.target.value })} />
        <input className="field" placeholder={f.kind === 'driver' ? 'Gate pass / licence no.' : 'Mulkiya no.'} value={f.document} onChange={(e) => setF({ ...f, document: e.target.value })} />
        <input className="field" type="date" aria-label="Expiry date" value={f.expires_on} onChange={(e) => setF({ ...f, expires_on: e.target.value })} />
      </div>
      <div className="mt-2 flex items-center gap-3"><button onClick={add} className="rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">Add to directory</button>{msg && <span className="text-sm text-muted-foreground">{msg}</span>}</div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="label-caps"><tr><th className="pb-2">Type</th><th>Name</th><th>Phone</th><th>Plate</th><th>Document</th><th>Expiry</th><th /></tr></thead>
          <tbody className="divide-y divide-border">
            {fleet.items.length === 0 && <tr><td colSpan={7} className="py-4 text-muted-foreground">No drivers or vehicles yet. Add them once, then pick them on any job.</td></tr>}
            {fleet.items.map((a) => { const s = expiryState(a.expires_on, now); const d = daysLeft(a.expires_on, now); return (
              <tr key={a.id}><td className="py-2.5">{a.kind === 'driver' ? 'Driver' : 'Vehicle'}</td><td>{a.name}</td><td className="font-mono">{a.phone}</td><td className="font-mono">{a.plate}</td><td className="font-mono text-muted-foreground">{a.document}</td>
                <td><span className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase ${tone[s]}`}>{s === 'unknown' ? 'No date' : s === 'expired' ? `Expired ${-d!}d ago` : `${d}d left`}</span></td>
                <td><button aria-label={`Delete ${a.name}`} onClick={() => del(a.id)} className="text-muted-foreground hover:text-hazard"><Trash2 className="h-4 w-4" /></button></td></tr>
            ); })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
