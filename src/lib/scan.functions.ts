import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { MulkiyaScan, PermitScan } from "./scan.server";

const File = z.string().max(9_000_000).regex(/^data:(image\/(png|jpeg|webp)|application\/pdf);base64,[A-Za-z0-9+/=]+$/);

/** Dispatcher-only AI OCR: reads permits / Mulkiya cards and returns fields for review. Never saves automatically. */
export const scanDocumentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ kind: z.enum(["permit", "mulkiya"]), file: File }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true; fields: PermitScan | MulkiyaScan } | { ok: false; error: string }> => {
    try {
      const { scanDocument } = await import("./scan.server");
      return { ok: true, fields: await scanDocument(data.kind, data.file) };
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      console.error("scan AI error", status, e);
      if (status === 429) return { ok: false, error: "Scanner is busy. Try again in a minute." };
      if (status === 402) return { ok: false, error: "AI credits have run out. Add credits in workspace billing to continue." };
      if (status === 403) return { ok: false, error: "AI access is not enabled for this workspace." };
      return { ok: false, error: "The document could not be read. Use a clearer, flat, well-lit photo." };
    }
  });

export type DriverScan = { kind: string; value: string; at: string; lat: number | null; lng: number | null };
/** Driver pass: record a scanned container/seal/e-Token code against the job. Token-authorized like delivery. */
export const saveDriverScan = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({
    token: z.string().uuid(), kind: z.enum(["Container no.", "Seal no.", "e-Token", "Equipment barcode", "Other"]),
    value: z.string().trim().min(2).max(200), lat: z.number().min(-90).max(90).nullable(), lng: z.number().min(-180).max(180).nullable(),
  }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const r = await supabaseAdmin.rpc("authorize_operations_driver", { _token: data.token });
    if (r.error || !r.data) throw new Error("Dispatch pass expired or revoked.");
    const j = r.data as unknown as { id: string };
    const cur = await supabaseAdmin.from("operations_jobs").select("scans").eq("id", j.id).single();
    const list = (Array.isArray(cur.data?.scans) ? cur.data.scans : []) as DriverScan[];
    if (list.length >= 50) throw new Error("Scan limit reached for this job.");
    const scan: DriverScan = { kind: data.kind, value: data.value, at: new Date().toISOString(), lat: data.lat, lng: data.lng };
    const u = await supabaseAdmin.from("operations_jobs").update({ scans: [...list, scan] }).eq("id", j.id);
    if (u.error) throw new Error("Scan not saved. Retry.");
    return { scans: [...list, scan] };
  });
