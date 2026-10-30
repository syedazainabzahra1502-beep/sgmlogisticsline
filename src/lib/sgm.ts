export type CartItem = { id: string; name: string; price: number; unit: string; qty: number };

export const SERVICES = [
  { id: "trailer-12", name: "12-Axle Modular Trailer Booking", price: 2450, unit: "per move", desc: "SPMT-compatible hydraulic modular, 240t payload, crew included." },
  { id: "rta-escort", name: "RTA Right-of-Way Escort", price: 680, unit: "per convoy", desc: "Licensed escort vehicles & RTA-coordinated ROW marshalling." },
  { id: "jafza-token", name: "Jebel Ali Gate e-Token Fast-Track", price: 95, unit: "per slot", desc: "Priority FCL-OUT appointment at Gate 4 via Dubai Trade." },
  { id: "dot-permit", name: "Abu Dhabi DoT Abnormal Load Permit", price: 420, unit: "per permit", desc: "Mussafah corridor filing & route survey." },
];

export const TIERS = [
  { id: "single", name: "Single Dispatch Pass", price: 149, unit: "/ dispatch", features: ["1 dispatch order", "RTA permit pre-check", "Gate e-Token booking"] },
  { id: "starter", name: "Fleet Starter", price: 499, unit: "/ month", features: ["5 dispatches included", "Permit verification engine", "Dispatch audit log"] },
  { id: "enterprise", name: "Enterprise Logistics & Telemetry", price: 1299, unit: "/ month", features: ["Unlimited dispatches", "Live API telemetry", "Customs seal export", "Dedicated ops desk"] },
];

export const VAT_RATE = 0.05;

export function cartTotals(items: CartItem[]) {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const vat = Math.round(subtotal * VAT_RATE * 100) / 100;
  return { subtotal, vat, total: subtotal + vat };
}

/** UAE TRN: 15 digits, starts with 100 */
export function isValidTRN(trn: string) {
  return /^100\d{12}$/.test(trn.replace(/\s|-/g, ""));
}

export type Load = { weightT: number; widthM: number; heightM: number; departHour: number };
export type PermitResult = { status: "cleared" | "pending" | "hazard"; flags: string[] };

export const LIMITS = { weightT: 60, widthM: 3.5, heightM: 4.0 };

/** Oversize loads may only move in the RTA night window 00:00–06:00. */
export function checkPermit(l: Load): PermitResult {
  const flags: string[] = [];
  if (l.weightT > LIMITS.weightT) flags.push(`Gross weight ${l.weightT}t exceeds 60t`);
  if (l.widthM > LIMITS.widthM) flags.push(`Width ${l.widthM}m exceeds 3.5m`);
  if (l.heightM > LIMITS.heightM) flags.push(`Height ${l.heightM}m exceeds 4.0m`);
  if (flags.length === 0) return { status: "cleared", flags: ["Within standard limits — no ROW permit required"] };
  const inWindow = l.departHour >= 0 && l.departHour < 6;
  if (!inWindow) {
    flags.push(`Departure ${String(l.departHour).padStart(2, "0")}:00 outside RTA night window (00:00–06:00)`);
    return { status: "hazard", flags };
  }
  return { status: "pending", flags: [...flags, "ROW permit + escort required"] };
}

export async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
