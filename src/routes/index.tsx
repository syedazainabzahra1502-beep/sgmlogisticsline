import { createFileRoute } from "@tanstack/react-router";
import { CartButton, CartDrawer, CartProvider, CommerceModule } from "@/components/sgm/Commerce";
import { ReadinessModule } from "@/components/sgm/Readiness";
import { AuditModule, GateModule, PermitModule, TelemetryModule } from "@/components/sgm/Modules";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SGM Global Line Logistics — Dubai Heavy-Lift Control & Dispatch" },
      { name: "description", content: "Jebel Ali gate e-tokens, RTA heavy-lift permits, modular trailer telemetry and B2B dispatch booking for UAE operations." },
      { property: "og:title", content: "SGM Global Line Logistics — Middle East Operations Portal" },
      { property: "og:description", content: "Heavy-lift control, permit verification and dispatch commerce for Dubai & Abu Dhabi corridors." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <CartProvider>
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div>
            <p className="font-semibold tracking-tight">SGM Global Line Logistics</p>
            <p className="label-caps">Middle East Ops · Heavy-Lift Control & Dispatch</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="https://sgmlogisticsline.com/" className="rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90">← Return to Corporate Site</a>
            <CartButton />
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-2">
        <div className="lg:col-span-2"><GateModule /></div>
        <PermitModule />
        <AuditModule />
        <div className="lg:col-span-2"><ReadinessModule /></div>
        <div className="lg:col-span-2"><TelemetryModule /></div>
        <div className="lg:col-span-2"><CommerceModule /></div>
      </main>
      <CartDrawer />
    </CartProvider>
  );
}
