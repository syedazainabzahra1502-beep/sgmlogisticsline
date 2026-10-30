import { createServerFn } from "@tanstack/react-start";
import type { Readiness } from "./readiness.server";

export const checkReadiness = createServerFn({ method: "POST" })
  .inputValidator((d: { shipment: string; cargo: string; notes: string }) => {
    const s = (v: unknown) => String(v ?? "").slice(0, 4000);
    return { shipment: s(d.shipment), cargo: s(d.cargo), notes: s(d.notes) };
  })
  .handler(async ({ data }): Promise<{ ok: true; r: Readiness } | { ok: false; error: string }> => {
    if (!data.shipment.trim() && !data.cargo.trim()) return { ok: false, error: "Enter shipment details or cargo specifications first." };
    try {
      const { assessReadiness } = await import("./readiness.server");
      return { ok: true, r: await assessReadiness(data) };
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      console.error("readiness AI error", status, e);
      if (status === 429) return { ok: false, error: "AI is busy right now. Please try again in a minute." };
      if (status === 402) return { ok: false, error: "AI credits have run out. Add credits in workspace billing to continue." };
      if (status === 403) return { ok: false, error: "AI access is not enabled for this workspace." };
      return { ok: false, error: "The readiness check could not be completed. Please try again." };
    }
  });
