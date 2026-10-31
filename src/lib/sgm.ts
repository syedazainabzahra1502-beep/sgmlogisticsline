export type CartItem = { id: string; name: string; price: number; unit: string; qty: number };

export const SERVICES = [
  { id: "route-survey", name: "Heavy Haul Route Survey & Escrow Clearance", price: 6800, unit: "per route", desc: "Corridor bridge & underpass civil clearance, RTA route inspection." },
  { id: "gate4-marshal", name: "Jebel Ali Port Gate 4 Marshalling & Dubai Trade e-Token", price: 3400, unit: "per move", desc: "Terminal coordination, night-window berth pull, customs manifest." },
  { id: "rta-row", name: "Dubai RTA Oversized Load ROW Permit Expediting", price: 2350, unit: "per permit", desc: "Multi-axle ROW permit, police escort coordination, bridge load fees." },
  { id: "trailer-12", name: "12-Axle Modular Trailer Booking", price: 9000, unit: "per move", desc: "Hydraulic modular, 240t payload, crew included." },
];

export const TIERS = [
  { id: "single", name: "Single Dispatch Pass", price: 550, unit: "/ dispatch", features: ["1 dispatch order", "RTA permit pre-check", "Gate e-Token booking"] },
  { id: "starter", name: "Fleet Starter", price: 1850, unit: "/ month", features: ["5 dispatches included", "Permit verification engine", "Dispatch audit log"] },
  { id: "enterprise", name: "Enterprise Logistics & Telemetry", price: 4800, unit: "/ month", features: ["Unlimited dispatches", "Live API telemetry", "Customs seal export", "Dedicated ops desk"] },
];

export const COMPANY = {
  name: "SGM Global Line Logistics FZE LLC",
  nameAr: "إس جي إم جلوبال لاين للخدمات اللوجستية م.م.ح / ذ.م.م",
  trn: "105290435400001",
  address: "Amber Gem Tower BC-889965, Shaikh Khalifa Street, Rashidiya 3, Ajman, UAE",
  email: "info@sgmlogisticsline.com",
  phone: "+971 55 998 6509",
  bank: { name: "Wio Bank PJSC", account: "SGM Global Line Logistics FZE LLC", number: "9941041090", iban: "AE810860000009941041090", swift: "WIOBAEADXXX" },
};

export const VAT_RATE = 0.05;

export function cartTotals(items: CartItem[]) {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const vat = Math.round(subtotal * VAT_RATE * 100) / 100;
  return { subtotal, vat, total: subtotal + vat };
}

/** UAE TRN: 15 digits, starts with 1 */
export function isValidTRN(trn: string) {
  return /^1\d{14}$/.test(trn.replace(/\s|-/g, ""));
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

export const fmt = (n: number) => "AED " + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
