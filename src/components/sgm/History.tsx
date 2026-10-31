import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Badge } from "./Modules";
import { Header } from "./Commerce";

const MAP = { ready: "cleared", needs_info: "pending", blocked: "hazard" } as const;

export function HistoryModule({ signedIn, refreshKey }: { signedIn: boolean; refreshKey: number }) {
  const [rows, setRows] = useState<Tables<"dispatches">[]>([]);
  const load = useCallback(async () => {
    if (!signedIn) return setRows([]);
    const { data } = await supabase.from("dispatches").select("*").order("created_at", { ascending: false }).limit(50);
    setRows(data ?? []);
  }, [signedIn]);
  useEffect(() => { load(); }, [load, refreshKey]);
  const del = async (id: string) => { await supabase.from("dispatches").delete().eq("id", id); load(); };
  return (
    <section className="panel p-5">
      <Header n="07" title="Saved Dispatch History" />
      {!signedIn ? (
        <p className="mt-3 text-sm text-muted-foreground"><Link to="/auth" className="text-primary underline">Sign in</Link> as a dispatcher to save readiness checks and view history.</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No saved dispatches yet. Run a readiness check above — it is saved automatically.</p>
      ) : (
        <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm">
          <thead className="label-caps"><tr><th className="pb-2">Date (GST)</th><th>Shipment</th><th>Summary</th><th>Status</th><th /></tr></thead>
          <tbody className="divide-y divide-border">{rows.map((r) => (
            <tr key={r.id} className="align-top">
              <td className="py-2.5 pr-3 font-mono text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString("en-GB", { timeZone: "Asia/Dubai" })}</td>
              <td className="pr-3 max-w-[16rem] truncate">{r.shipment || r.cargo}</td>
              <td className="pr-3 text-muted-foreground">{r.summary}</td>
              <td className="pr-3"><Badge s={MAP[r.status as keyof typeof MAP] ?? "pending"} /></td>
              <td><button onClick={() => del(r.id)} className="text-xs text-muted-foreground hover:text-hazard">Delete</button></td>
            </tr>))}</tbody>
        </table></div>
      )}
    </section>
  );
}
