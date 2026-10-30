import { useEffect, useState } from "react";
import { checkPermit, sha256, LIMITS } from "@/lib/sgm";
import { Header } from "./Commerce";

const tone = { cleared: "text-cleared border-cleared/40 bg-cleared/10", pending: "text-pending border-pending/40 bg-pending/10", hazard: "text-hazard border-hazard/40 bg-hazard/10" };
const label = { cleared: "Cleared", pending: "Permit Pending", hazard: "Load Hazard" };
export const Badge = ({ s }: { s: keyof typeof tone }) => <span className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tone[s]}`}>{label[s]}</span>;

const SLOTS = [
  { c: "MSKU 778120-4", term: "Jebel Ali T2 · Gate 4 (JAFZA)", slot: "14:00–15:00", tok: "ET-JA4-90311", s: "cleared" as const, dem: "0 days" },
  { c: "CMAU 552019-7", term: "Jebel Ali T3 · Gate 4", slot: "15:00–16:00", tok: "ET-JA4-90344", s: "pending" as const, dem: "Free time ends 18:00" },
  { c: "HLXU 310872-1", term: "Dubai Maritime City (DMC)", slot: "16:00–17:00", tok: "ET-DMC-11208", s: "cleared" as const, dem: "0 days" },
  { c: "OOLU 904417-3", term: "Jebel Ali T1 · Gate 4", slot: "Missed 11:00", tok: "ET-JA4-90102", s: "hazard" as const, dem: "Day 2 · AED 450 accruing" },
];

export function GateModule() {
  const [sync, setSync] = useState<Date | null>(null);
  useEffect(() => { setSync(new Date()); const t = setInterval(() => setSync(new Date()), 15000); return () => clearInterval(t); }, []);
  return (
    <section className="panel p-5">
      <Header n="01" title="Jebel Ali Port Gate 4 · Dubai Trade e-Token Appointment Sync" live />
      <p className="label-caps mt-1">Dubai Trade / CargoWaves FCL-OUT · last sync {sync?.toLocaleTimeString("en-GB", { timeZone: "Asia/Dubai" })} GST</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="label-caps"><tr><th className="pb-2">Container</th><th>Terminal</th><th>Slot</th><th>e-Token</th><th>Demurrage</th><th>Status</th></tr></thead>
          <tbody className="divide-y divide-border">
            {SLOTS.map((r) => (
              <tr key={r.c}><td className="py-2.5 font-mono">{r.c}</td><td>{r.term}</td><td className="font-mono">{r.slot}</td><td className="font-mono text-muted-foreground">{r.tok}</td><td className={r.s === "hazard" ? "text-hazard" : "text-muted-foreground"}>{r.dem}</td><td><Badge s={r.s} /></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const CORRIDORS = ["Jebel Ali Gate 4 → Al Jaddaf Dockyard", "DMC → Jebel Ali Free Zone", "Jebel Ali → Mussafah Industrial (Abu Dhabi)", "Al Jaddaf → Dubai Industrial City"];

export function PermitModule() {
  const [l, setL] = useState({ weightT: 82, widthM: 4.4, heightM: 4.6, departHour: 1 });
  const [corr, setCorr] = useState(CORRIDORS[2]);
  const [hash, setHash] = useState("");
  const r = checkPermit(l);
  useEffect(() => { sha256(JSON.stringify({ ...l, corr, s: r.status })).then(setHash); }, [l, corr, r.status]);
  const f = (k: keyof typeof l, lab: string, step: number) => (
    <label className="block"><span className="label-caps">{lab}</span><input type="number" step={step} className="field mt-1 font-mono" value={l[k]} onChange={(e) => setL({ ...l, [k]: Number(e.target.value) })} /></label>
  );
  return (
    <section className="panel p-5">
      <Header n="02" title="Dubai RTA Oversized Load Right-of-Way (ROW) Permit" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        {f("weightT", `Weight t (limit ${LIMITS.weightT})`, 1)}{f("widthM", `Width m (limit ${LIMITS.widthM})`, 0.1)}
        {f("heightM", `Height m (limit ${LIMITS.heightM})`, 0.1)}{f("departHour", "Departure hour (GST)", 1)}
      </div>
      <label className="mt-3 block"><span className="label-caps">Corridor</span>
        <select className="field mt-1" value={corr} onChange={(e) => setCorr(e.target.value)}>{CORRIDORS.map((c) => <option key={c}>{c}</option>)}</select>
      </label>
      <div className="mt-4 rounded-md border border-border bg-background/60 p-3">
        <div className="flex items-center justify-between"><span className="label-caps">Verification result</span><Badge s={r.status} /></div>
        <ul className="mt-2 space-y-1 text-sm">{r.flags.map((x) => <li key={x}>· {x}</li>)}</ul>
        <p className="label-caps mt-3">Approval hash</p>
        <p className="break-all font-mono text-xs text-primary">{hash}</p>
      </div>
    </section>
  );
}

const TRAILERS = [
  { id: "SPMT-12A · DXB-H 44021", route: "Jebel Ali Gate 4 → Mussafah M-37", cargo: 82 },
  { id: "MOD-16 · DXB-H 39117", route: "Mussafah M-37 → Jebel Ali Gate 4", cargo: 64 },
];
// Jebel Ali Gate 4 → Mussafah corridor (E11)
const JA = [25.0108, 55.0614], MU = [24.3486, 54.5049];
const TARE = 38;

function useTelemetry(seed: number, cargo: number) {
  const gen = () => {
    const now = Date.now();
    const gvw = +(TARE + cargo + Math.sin(now / 9000 + seed) * 0.3).toFixed(1);
    const base = (gvw * 1000) / 12;
    let p = ((now / 600000 + seed * 0.37) % 1);
    if (seed) p = 1 - p;
    return {
      gvw,
      axles: Array.from({ length: 12 }, (_, i) => Math.round(base + Math.sin(i * 0.9 + seed + now / 4000) * 450 + (i > 8 ? 380 : 0))),
      tilt: +(1.2 + Math.sin(now / 3000 + seed) * 1.6 + seed * 0.8).toFixed(2),
      g: +(0.18 + Math.abs(Math.sin(now / 1700 + seed)) * 0.35).toFixed(2),
      speed: Math.round(22 + Math.sin(now / 5000 + seed) * 6),
      lat: JA[0] + (MU[0] - JA[0]) * p, lng: JA[1] + (MU[1] - JA[1]) * p, km: Math.round(p * 96),
    };
  };
  const [d, setD] = useState(() => ({ gvw: 0, axles: Array(12).fill(0) as number[], tilt: 0, g: 0, speed: 0, lat: JA[0], lng: JA[1], km: 0 }));
  const [pings, setPings] = useState<{ t: string; lat: number; lng: number; v: number }[]>([]);
  useEffect(() => {
    const tick = () => { const n = gen(); setD(n); setPings((p) => [{ t: new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Dubai" }), lat: n.lat, lng: n.lng, v: n.speed }, ...p].slice(0, 4)); };
    tick(); const t = setInterval(tick, 3000); return () => clearInterval(t);
  }, []);
  return { d, pings };
}

function TrailerCard({ t, seed }: { t: (typeof TRAILERS)[number]; seed: number }) {
  const { d, pings } = useTelemetry(seed, t.cargo);
  const s = d.tilt > 3 || d.g > 0.5 ? "hazard" : d.tilt > 2.2 ? "pending" : "cleared";
  const LIMIT = 10500;
  return (
    <div className="rounded-md border border-border bg-background/60 p-4">
      <div className="flex items-center justify-between"><div><p className="font-mono text-sm">{t.id}</p><p className="text-xs text-muted-foreground">{t.route} · KM {d.km}/96</p></div><Badge s={s} /></div>
      <div className="mt-4 grid grid-cols-4 gap-2 font-mono">
        <Stat k="GVW" v={`${d.gvw}t`} /><Stat k="Tilt" v={`${d.tilt}°`} warn={d.tilt > 2.2} /><Stat k="Vibration" v={`${d.g}g`} warn={d.g > 0.5} /><Stat k="Speed" v={`${d.speed}`} />
      </div>
      <p className="label-caps mt-4">Axle load distribution (kg / axle line · limit {LIMIT.toLocaleString()})</p>
      <table className="mt-2 w-full font-mono text-xs"><tbody>
        {[0, 6].map((o) => <tr key={o}>{d.axles.slice(o, o + 6).map((a, i) => <td key={i} className={`border border-border px-1 py-1 text-center ${a > LIMIT ? "text-hazard" : a > LIMIT * 0.9 ? "text-pending" : ""}`}><span className="block text-[9px] text-muted-foreground">A{o + i + 1}</span>{a.toLocaleString()}</td>)}</tr>)}
      </tbody></table>
      <p className="label-caps mt-4">GPS pings · Jebel Ali – Mussafah corridor (E11)</p>
      <table className="mt-2 w-full font-mono text-xs"><thead className="text-muted-foreground"><tr><th className="text-left">GST</th><th className="text-left">Lat</th><th className="text-left">Lng</th><th className="text-right">km/h</th></tr></thead>
        <tbody>{pings.map((p) => <tr key={p.t + p.lat}><td>{p.t}</td><td>{p.lat.toFixed(5)}°N</td><td>{p.lng.toFixed(5)}°E</td><td className="text-right">{p.v}</td></tr>)}</tbody></table>
    </div>
  );
}
const Stat = ({ k, v, warn }: { k: string; v: string; warn?: boolean }) => (
  <div className="rounded border border-border p-2"><p className="label-caps">{k}</p><p className={`text-base ${warn ? "text-pending" : ""}`}>{v}</p></div>
);

export function TelemetryModule() {
  return (
    <section className="panel p-5">
      <Header n="03" title="Hydraulic Modular Trailer Telemetry — Jebel Ali ↔ Mussafah" live />
      <div className="mt-4 grid gap-4 md:grid-cols-2">{TRAILERS.map((t, i) => <TrailerCard key={t.id} t={t} seed={i} />)}</div>
    </section>
  );
}

const EVENTS = [
  "Dispatch DSP-26-4471 created · 12-axle modular · 82t transformer",
  "RTA ROW permit RTA-ROW-88213 attached · window 00:00–06:00",
  "Transit seal applied · Jebel Ali Gate 4 exit",
  "Checkpoint · Sheikh Zayed Rd / E11 Ghantoot border",
  "Abu Dhabi DoT permit verified · Mussafah M-37",
];

export function AuditModule() {
  const [rows, setRows] = useState<{ t: string; e: string; h: string; p: string }[]>([]);
  useEffect(() => {
    (async () => {
      let prev = "0".repeat(64); const out = [];
      const base = new Date("2026-10-30T00:12:00+04:00").getTime();
      for (let i = 0; i < EVENTS.length; i++) {
        const t = new Date(base + i * 47 * 60000).toISOString();
        const h = await sha256(prev + t + EVENTS[i]);
        out.push({ t, e: EVENTS[i], h, p: prev }); prev = h;
      }
      setRows(out.reverse());
    })();
  }, []);
  return (
    <section className="panel p-5">
      <Header n="05" title="JAFZA / Dubai Customs Digital Manifest Verification" />
      <p className="label-caps mt-1">SHA-256 hash chain · tamper-proof manifest seals verified against JAFZA & Dubai Customs</p>
      <ol className="mt-4 space-y-2">
        {rows.map((r) => (
          <li key={r.h} className="rounded-md border border-border bg-background/60 p-3">
            <div className="flex flex-wrap justify-between gap-2"><span className="text-sm">{r.e}</span><span className="font-mono text-xs text-muted-foreground">{new Date(r.t).toLocaleString("en-GB", { timeZone: "Asia/Dubai" })} GST</span></div>
            <p className="mt-1 truncate font-mono text-[11px] text-cleared">seal {r.h}</p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">prev {r.p}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
