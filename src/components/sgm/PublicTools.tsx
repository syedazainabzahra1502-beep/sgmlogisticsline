import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { COMPANY, fmt } from '@/lib/sgm';
import { exposure } from '@/lib/operations';
import { Header } from './Commerce';

export function CredentialsPanel() {
  const rows: [string, string][] = [['Legal entity', COMPANY.name], ['Arabic name', COMPANY.nameAr], ['Tax Registration No.', COMPANY.trn], ['Registered office', COMPANY.address], ['Accounts', `${COMPANY.email} · ${COMPANY.phone}`], ['Receiving bank', `${COMPANY.bank.name} · IBAN ${COMPANY.bank.iban}`]];
  return (
    <section className="panel p-5">
      <Header n="02" title="Verified Corporate Credentials" />
      <dl className="mt-4 divide-y divide-border text-sm">{rows.map(([k, v]) => <div key={k} className="grid gap-1 py-2 sm:grid-cols-[180px_1fr]"><dt className="label-caps">{k}</dt><dd className="break-words font-mono">{v}</dd></div>)}</dl>
    </section>
  );
}

export function TrackLookup() {
  const nav = useNavigate();
  const [v, setV] = useState('');
  const go = () => { const t = v.trim().split('/').pop() ?? ''; if (t) void nav({ to: '/track/$token', params: { token: t } }); };
  return (
    <section className="panel p-5">
      <Header n="01" title="Track My Shipment" />
      <p className="mt-1 text-sm text-muted-foreground">Paste the tracking link or code SGM sent you to see Gate 4 entry, escort and corridor milestones.</p>
      <div className="mt-4 flex gap-2"><input className="field" placeholder="Tracking link or code" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} /><button onClick={go} className="rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">Track</button></div>
    </section>
  );
}

export function DemurrageCalc() {
  const [d, setD] = useState({ discharge: '', freeDays: 5, rate: 450 });
  const [now, setNow] = useState(0);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t); }, []);
  const until = d.discharge ? new Date(Date.parse(`${d.discharge}:00+04:00`) + d.freeDays * 86400000).toISOString() : '';
  const e = until && now ? exposure(until, d.rate, now) : null;
  return (
    <section className="panel p-5">
      <Header n="03" title="Port Free-Time & Demurrage Calculator" />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label><span className="label-caps">Discharged (GST)</span><input type="datetime-local" className="field mt-1" value={d.discharge} onChange={(x) => setD({ ...d, discharge: x.target.value })} /></label>
        <label><span className="label-caps">Free days (per line / terminal)</span><input type="number" min={0} className="field mt-1 font-mono" value={d.freeDays} onChange={(x) => setD({ ...d, freeDays: Math.max(0, Number(x.target.value)) })} /></label>
        <label><span className="label-caps">Daily charge (AED)</span><input type="number" min={0} className="field mt-1 font-mono" value={d.rate} onChange={(x) => setD({ ...d, rate: Math.max(0, Number(x.target.value)) })} /></label>
      </div>
      <div className="mt-4 rounded-md border border-border bg-background/60 p-4">
        {!e ? <p className="text-sm text-muted-foreground">Enter the discharge time to start the countdown.</p> : e.hours >= 0
          ? <p className={`font-mono text-xl ${e.hours < 24 ? 'text-pending' : 'text-cleared'}`}>Free time ends in {e.hours.toFixed(1)} h · {new Date(until).toLocaleString('en-GB', { timeZone: 'Asia/Dubai' })} GST</p>
          : <p className="font-mono text-xl text-hazard">{e.days} chargeable day(s) · {fmt(e.cost)} accrued</p>}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Use the free days and rate from your shipping line or DP World tariff. Each started 24 hours after free time counts as a day; tiered tariffs and holidays can change the real bill.</p>
    </section>
  );
}
