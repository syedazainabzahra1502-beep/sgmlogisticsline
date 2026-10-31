import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { checkReadiness } from "@/lib/readiness.functions";
import type { Readiness } from "@/lib/readiness.server";
import { Badge } from "./Modules";
import { Header } from "./Commerce";

const MAP = { ready: "cleared", needs_info: "pending", blocked: "hazard" } as const;

export function ReadinessModule({ signedIn, onSaved }: { signedIn?: boolean; onSaved?: () => void }) {
  const run = useServerFn(checkReadiness);
  const [f, setF] = useState({ shipment: "", cargo: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [r, setR] = useState<Readiness | null>(null);
  const go = async () => {
    setBusy(true); setErr("");
    try {
      const res = await run({ data: f });
      if (!res.ok) setErr(res.error);
      else {
        setR(res.r);
        if (signedIn) {
          const { supabase } = await import("@/integrations/supabase/client");
          const { error } = await supabase.from("dispatches").insert({ ...f, status: res.r.status, summary: res.r.summary, missing: res.r.missing, risks: res.r.risks });
          if (error) setErr("Result shown but could not be saved to history."); else onSaved?.();
        }
      }
    }
    catch { setErr("The readiness check could not be completed. Please try again."); }
    finally { setBusy(false); }
  };
  const area = (k: keyof typeof f, lab: string, ph: string) => (
    <label className="block"><span className="label-caps">{lab}</span><textarea rows={3} className="field mt-1" value={f[k]} placeholder={ph} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>
  );
  return (
    <section className="panel p-5">
      <Header n="06" title="AI Dispatch Readiness Check" />
      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          {area("shipment", "Shipment details", "Origin, destination, pickup date/time, consignee, container / BL no.")}
          {area("cargo", "Cargo specifications", "Weight (t), dimensions L×W×H (m), cargo type, hazardous class")}
          {area("notes", "Transport notes", "Permits held, e-Token, escort, route constraints")}
          <button disabled={busy} onClick={go} className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Checking readiness…" : "Check readiness"}</button>
          {err && <p className="text-sm text-hazard">{err}</p>}
        </div>
        <div className="rounded-md border border-border bg-background/60 p-4">
          {!r ? <p className="text-sm text-muted-foreground">Enter the shipment details and select Check readiness to get a summary and a list of missing information.</p> : (
            <div className="space-y-4">
              <div className="flex items-center justify-between"><span className="label-caps">Readiness</span><Badge s={MAP[r.status]} /></div>
              <p className="text-sm leading-relaxed">{r.summary}</p>
              {r.missing.length > 0 && (<div><p className="label-caps mb-1">Missing information</p>
                <table className="w-full text-sm"><tbody className="divide-y divide-border">{r.missing.map((m) => <tr key={m.field}><td className="py-1.5 pr-3 font-medium text-pending">{m.field}</td><td className="text-muted-foreground">{m.why}</td></tr>)}</tbody></table></div>)}
              {r.risks.length > 0 && (<div><p className="label-caps mb-1">Compliance risks</p><ul className="space-y-1 text-sm">{r.risks.map((x) => <li key={x} className="text-hazard">· {x}</li>)}</ul></div>)}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
