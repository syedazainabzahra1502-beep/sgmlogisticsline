import { createContext, useContext, useState, type ReactNode } from "react";
import { cartTotals, fmt, isValidTRN, SERVICES, TIERS, type CartItem } from "@/lib/sgm";

type Ctx = {
  items: CartItem[];
  add: (i: Omit<CartItem, "qty">) => void;
  setQty: (id: string, q: number) => void;
  clear: () => void;
  open: boolean;
  setOpen: (o: boolean) => void;
  subs: string[];
  addSubs: (ids: string[]) => void;
};
const CartCtx = createContext<Ctx | null>(null);
export const useCart = () => {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside provider");
  return c;
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [subs, setSubs] = useState<string[]>([]);
  const add: Ctx["add"] = (i) => {
    setItems((p) => (p.find((x) => x.id === i.id) ? p.map((x) => (x.id === i.id ? { ...x, qty: x.qty + 1 } : x)) : [...p, { ...i, qty: 1 }]));
    setOpen(true);
  };
  const setQty = (id: string, q: number) => setItems((p) => (q <= 0 ? p.filter((x) => x.id !== id) : p.map((x) => (x.id === id ? { ...x, qty: q } : x))));
  return (
    <CartCtx.Provider value={{ items, add, setQty, clear: () => setItems([]), open, setOpen, subs, addSubs: (ids) => setSubs((s) => [...new Set([...s, ...ids])]) }}>
      {children}
    </CartCtx.Provider>
  );
}

export function CartButton() {
  const { items, setOpen } = useCart();
  const n = items.reduce((s, i) => s + i.qty, 0);
  return (
    <button onClick={() => setOpen(true)} className="relative rounded-md border border-border bg-secondary px-3 py-1.5 text-sm font-medium hover:bg-accent">
      Dispatch Basket
      <span className="ml-2 rounded bg-primary px-1.5 font-mono text-xs text-primary-foreground">{n}</span>
    </button>
  );
}

export function CommerceModule() {
  const { add, subs } = useCart();
  return (
    <section className="panel p-5" id="commerce">
      <Header n="04" title="Cart, Checkout & Active Subscriptions" />
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {TIERS.map((t) => (
          <div key={t.id} className={`rounded-md border p-4 ${t.id === "enterprise" ? "border-primary" : "border-border"} bg-background/60`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{t.name}</p>
              {subs.includes(t.id) && <span className="label-caps text-cleared">Active</span>}
            </div>
            <p className="mt-2 font-mono text-2xl">{fmt(t.price)}<span className="text-sm text-muted-foreground"> {t.unit}</span></p>
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">{t.features.map((f) => <li key={f}>— {f}</li>)}</ul>
            <button onClick={() => add({ id: t.id, name: t.name, price: t.price, unit: t.unit })} className="mt-4 w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Add to basket</button>
          </div>
        ))}
      </div>
      <p className="label-caps mt-6">Dispatch Services</p>
      <div className="mt-2 divide-y divide-border rounded-md border border-border">
        {SERVICES.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div>
              <p className="text-sm font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm">{fmt(s.price)} <span className="text-muted-foreground">{s.unit}</span></span>
              <button onClick={() => add({ id: s.id, name: s.name, price: s.price, unit: s.unit })} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">+ Add</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const METHODS = ["Card", "Apple Pay", "Dubai Pay", "Purchase Order"] as const;

export function CartDrawer() {
  const { items, setQty, clear, open, setOpen, addSubs } = useCart();
  const [step, setStep] = useState<"cart" | "checkout" | "done">("cart");
  const [method, setMethod] = useState<(typeof METHODS)[number]>("Card");
  const [trn, setTrn] = useState("");
  const [company, setCompany] = useState("");
  const [card, setCard] = useState({ num: "", exp: "", cvc: "" });
  const [po, setPo] = useState("");
  const [err, setErr] = useState("");
  const [ref, setRef] = useState("");
  const t = cartTotals(items);
  if (!open) return null;

  const brand = /^4/.test(card.num) ? "VISA" : /^5[1-5]/.test(card.num) ? "MASTERCARD" : /^3[47]/.test(card.num) ? "AMEX" : "";

  const pay = () => {
    if (!company.trim()) return setErr("Company legal name is required.");
    if (trn && !isValidTRN(trn)) return setErr("UAE TRN must be 15 digits starting with 100.");
    if (method === "Card" && (card.num.replace(/\s/g, "").length < 15 || !card.exp || card.cvc.length < 3)) return setErr("Enter complete card details.");
    if (method === "Purchase Order" && !po.trim()) return setErr("Enter your Purchase Order number.");
    setErr("");
    addSubs(items.filter((i) => TIERS.some((x) => x.id === i.id)).map((i) => i.id));
    setRef("SGM-" + Date.now().toString(36).toUpperCase());
    clear();
    setStep("done");
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/70 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <aside onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-md flex-col border-l border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <p className="font-semibold">{step === "checkout" ? "B2B Checkout" : step === "done" ? "Order Confirmed" : "Dispatch Basket"}</p>
          <button onClick={() => { setOpen(false); setStep("cart"); }} className="label-caps hover:text-foreground">Close ✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {step === "done" && (
            <div className="space-y-2">
              <p className="text-cleared font-semibold">Payment authorised</p>
              <p className="text-sm text-muted-foreground">Reference <span className="font-mono text-foreground">{ref}</span>. A VAT tax invoice will be issued to {company}.</p>
            </div>
          )}
          {step === "cart" && (items.length === 0 ? <p className="text-sm text-muted-foreground">Basket is empty. Add a tier or dispatch service.</p> : (
            <div className="space-y-3">
              {items.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
                  <div><p className="text-sm">{i.name}</p><p className="font-mono text-xs text-muted-foreground">{fmt(i.price)} {i.unit}</p></div>
                  <div className="flex items-center gap-2 font-mono text-sm">
                    <button onClick={() => setQty(i.id, i.qty - 1)} className="h-7 w-7 rounded border border-border">−</button>
                    {i.qty}
                    <button onClick={() => setQty(i.id, i.qty + 1)} className="h-7 w-7 rounded border border-border">+</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {step === "checkout" && (
            <div className="space-y-4">
              <div><p className="label-caps mb-1">Company legal name</p><input className="field" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Al Futtaim Engineering LLC" /></div>
              <div><p className="label-caps mb-1">UAE TRN (VAT invoicing)</p><input className="field font-mono" value={trn} onChange={(e) => setTrn(e.target.value)} placeholder="100XXXXXXXXXXXX" maxLength={17} /></div>
              <div>
                <p className="label-caps mb-1">Payment method</p>
                <div className="grid grid-cols-2 gap-2">
                  {METHODS.map((m) => <button key={m} onClick={() => setMethod(m)} className={`rounded-md border px-2 py-2 text-xs ${method === m ? "border-primary text-primary" : "border-border"}`}>{m}</button>)}
                </div>
              </div>
              {method === "Card" && (
                <div className="space-y-2">
                  <div className="relative"><input className="field font-mono" placeholder="Card number" value={card.num} onChange={(e) => setCard({ ...card, num: e.target.value.replace(/[^\d ]/g, "") })} maxLength={19} /><span className="label-caps absolute right-3 top-2.5">{brand}</span></div>
                  <div className="grid grid-cols-2 gap-2"><input className="field font-mono" placeholder="MM/YY" value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} maxLength={5} /><input className="field font-mono" placeholder="CVC" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "") })} maxLength={4} /></div>
                  <p className="text-xs text-muted-foreground">Visa · Mastercard · AMEX — processed via Stripe</p>
                </div>
              )}
              {(method === "Apple Pay" || method === "Dubai Pay") && <p className="rounded-md border border-border p-3 text-sm text-muted-foreground">You'll confirm with {method} after placing the order.</p>}
              {method === "Purchase Order" && <div><p className="label-caps mb-1">PO / Invoice number</p><input className="field font-mono" value={po} onChange={(e) => setPo(e.target.value)} placeholder="PO-2026-0001" /><p className="mt-1 text-xs text-muted-foreground">Corporate direct transfer, Net-30 terms.</p></div>}
              {err && <p className="text-sm text-hazard">{err}</p>}
            </div>
          )}
        </div>
        {step !== "done" && items.length > 0 && (
          <div className="space-y-1 border-t border-border p-4 font-mono text-sm">
            <Row k="Subtotal" v={fmt(t.subtotal)} /><Row k="VAT 5%" v={fmt(t.vat)} /><Row k="Total (USD)" v={fmt(t.total)} bold />
            {step === "cart"
              ? <button onClick={() => setStep("checkout")} className="mt-3 w-full rounded-md bg-primary py-2.5 font-sans font-semibold text-primary-foreground">Proceed to checkout</button>
              : <div className="mt-3 flex gap-2"><button onClick={() => setStep("cart")} className="rounded-md border border-border px-4 font-sans">Back</button><button onClick={pay} className="flex-1 rounded-md bg-primary py-2.5 font-sans font-semibold text-primary-foreground">Pay {fmt(t.total)}</button></div>}
          </div>
        )}
      </aside>
    </div>
  );
}

const Row = ({ k, v, bold }: { k: string; v: string; bold?: boolean }) => (
  <div className={`flex justify-between ${bold ? "text-foreground font-semibold" : "text-muted-foreground"}`}><span>{k}</span><span>{v}</span></div>
);

export function Header({ n, title, live }: { n: string; title: string; live?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-baseline gap-3"><span className="font-mono text-xs text-primary">M{n}</span><h2 className="font-semibold">{title}</h2></div>
      {live && <span className="label-caps flex items-center gap-1.5"><span className="live-dot h-1.5 w-1.5 rounded-full bg-cleared" />Live</span>}
    </div>
  );
}
