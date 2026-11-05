import { createFileRoute } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { driverJob } from '@/lib/operations.functions';
import { DetailsSchema, stageLabel } from '@/lib/operations';
import { COMPANY } from '@/lib/sgm';
import { useState } from 'react';
import { DeliveryForm } from '@/components/sgm/DeliveryForm';
import { PretripChecklist } from '@/components/sgm/Pretrip';
function PodModal({ token, onDone }: { token: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button className="mt-8 w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground" onClick={() => setOpen(true)}>Capture signed e-POD</button>;
  return <div role="dialog" aria-modal="true" aria-label="Electronic proof of delivery" className="fixed inset-0 z-50 overflow-y-auto bg-background/95 p-5"><div className="mx-auto max-w-3xl"><button className="text-sm text-muted-foreground" onClick={() => setOpen(false)}>✕ Close</button><DeliveryForm token={token} onDone={() => { setOpen(false); onDone(); }} /></div></div>;
}
const packetQuery = (token: string) => queryOptions({ queryKey: ['driver', token], queryFn: () => driverJob({ data: { token } }), staleTime: 0 });
export const Route = createFileRoute('/driver/$token')({
 head: () => ({ meta: [{ title: 'Driver Dispatch Pass — SGM Global Line Logistics' }, { name: 'description', content: 'SGM field dispatch documents and delivery acknowledgment.' }, { property: 'og:title', content: 'SGM Driver Dispatch Pass' }, { property: 'og:description', content: 'Authorized shipment documents and delivery proof.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex, nofollow' }] }),
 loader: ({ params, context }) => context.queryClient.ensureQueryData(packetQuery(params.token)), component: Driver,
});
function Driver() {
 const { token } = Route.useParams(); const { data } = useSuspenseQuery(packetQuery(token)); const client = useQueryClient();
 const d = data ? DetailsSchema.parse(data.details) : null;
 return <main className="mx-auto min-h-screen max-w-3xl px-5 py-8"><p className="text-sm text-primary">{COMPANY.name}</p><h1 className="mt-3 text-2xl font-semibold">Driver dispatch pass</h1>{!data || !d ? <p className="mt-6 text-pending">This pass has expired, was revoked or does not exist.</p> : <><p className="mt-6 font-mono">{data.reference} · {stageLabel(data.stage)}</p><h2 className="mt-2 text-xl break-words">{data.origin} → {data.destination}</h2><dl className="mt-5 divide-y divide-border">{[['Cargo',d.cargo],['Pickup (GST)',d.pickup],['Consignee',d.consignee],['BL / container',d.bl],['RTA ROW permit',d.rta],['Abu Dhabi permit',d.dot],['Gate 4 e-Token',d.token],['Escort lead',d.escortPhone],['Approved route',d.route]].map(([k,v]) => <div key={k} className="py-3"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-1 break-words">{v || 'Not recorded'}</dd></div>)}</dl><p className="mt-4 text-xs text-pending">This pass is not an authority approval. Verify original documents before moving.</p><h2 className="mt-6 font-semibold">Shipment documents</h2>{data.files.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No documents attached.</p> : data.files.map(f => <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className="mt-3 block break-all border-b border-border pb-3 text-primary">{f.kind} · {f.name}</a>)}{data.delivered ? <p className="mt-8 text-cleared">Delivery recorded. Thank you.</p> : !data.pretrip ? <PretripChecklist token={token} onDone={() => client.invalidateQueries({ queryKey: ['driver',token] })} /> : <><p className="mt-8 text-sm text-cleared">Pre-trip checklist confirmed by {data.pretrip.by} · {new Date(data.pretrip.at).toLocaleString('en-GB', { timeZone: 'Asia/Dubai' })} GST</p><PodModal token={token} onDone={() => client.invalidateQueries({ queryKey: ['driver',token] })} /></>}</>}<a className="mt-8 inline-block text-primary" href={`tel:${COMPANY.phone.replaceAll(' ','')}`}>SGM Operations · {COMPANY.phone}</a></main>;
}
