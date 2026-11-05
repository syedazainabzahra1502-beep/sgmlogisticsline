import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { HistoryModule } from "@/components/sgm/History";
import { CartProvider } from "@/components/sgm/Commerce";
import { PermitModule } from "@/components/sgm/Modules";
import { OperationsSuite } from "@/components/sgm/OperationsSuite";
import { FleetModule, useFleet } from "@/components/sgm/Fleet";
import { QuoteRequest, QuoteInbox } from "@/components/sgm/Quotes";
import { useState } from "react";
import { CredentialsPanel, DemurrageCalc, TrackLookup } from "@/components/sgm/PublicTools";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SGM Global Line Logistics — UAE Heavy-Haul Operations Desk" },
      { name: "description", content: "Track SGM shipments, check port free time, and run heavy-haul jobs: permits, axle planning, drivers, quotes, e-POD and tax invoices." },
      { property: "og:title", content: "SGM Global Line Logistics — UAE Heavy-Haul Operations Desk" },
      { property: "og:description", content: "Shipment tracking, demurrage countdown and end-to-end heavy-haul job management for Dubai & Abu Dhabi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { user } = useSession();
  const signedIn = !!user;
  const fleet = useFleet(signedIn);
  const [jobsKey, setJobsKey] = useState(0);
  return (
    <CartProvider>
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div>
            <p className="font-semibold tracking-tight">SGM Global Line Logistics</p>
            <p className="label-caps">UAE Heavy-Haul Operations Desk</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="https://sgmlogisticsline.com/" className="rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90">← Return to Corporate Site</a>
            {user ? (
              <button onClick={() => supabase.auth.signOut()} title={user.email} className="rounded-md border border-border px-3 py-1.5 text-sm">Sign out</button>
            ) : (
              <Link to="/auth" className="rounded-md border border-border px-3 py-1.5 text-sm">Dispatcher sign in</Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-2">
        {signedIn ? (
          <>
            <QuoteInbox onConverted={() => setJobsKey(k => k + 1)} />
            <div className="lg:col-span-2"><OperationsSuite key={jobsKey} signedIn fleet={fleet.items} /></div>
            <div className="lg:col-span-2"><FleetModule signedIn fleet={fleet} /></div>
            <DemurrageCalc />
            <PermitModule />
            <div className="lg:col-span-2"><HistoryModule signedIn refreshKey={0} /></div>
          </>
        ) : (
          <>
            <TrackLookup />
            <CredentialsPanel />
            <DemurrageCalc />
            <PermitModule />
            <QuoteRequest />
          </>
        )}
      </main>
    </CartProvider>
  );
}
