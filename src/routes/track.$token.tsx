import { createFileRoute } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { trackJob } from '@/lib/operations.functions';
import { STAGES, stageLabel } from '@/lib/operations';
import { COMPANY } from '@/lib/sgm';
const trackingQuery = (token: string) => queryOptions({ queryKey: ['tracking', token], queryFn: () => trackJob({ data: { token } }), refetchInterval: 30000 });
export const Route = createFileRoute('/track/$token')({
  head: () => ({ meta: [{ title: 'Shipment Tracking — SGM Global Line Logistics' }, { name: 'description', content: 'SGM shipment milestones and dispatch updates.' }, { property: 'og:title', content: 'SGM Shipment Tracking' }, { property: 'og:description', content: 'Secure shared shipment progress.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex, nofollow' } ] }),
  loader: ({ params, context }) => context.queryClient.ensureQueryData(trackingQuery(params.token)), component: Tracking,
});
function Tracking() {
  const { token } = Route.useParams(); const { data, isFetching, dataUpdatedAt } = useSuspenseQuery(trackingQuery(token));
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-10"><p className="text-sm text-primary">{COMPANY.name}</p><h1 className="mt-3 text-2xl font-semibold">Shipment tracking</h1>{!data ? <p className="mt-6 text-pending">This link has expired, was revoked or does not exist.</p> : <>
    <p className="mt-6 font-mono">{data.reference}</p><h2 className="mt-2 text-xl break-words">{data.origin} → {data.destination}</h2><p className="mt-3 text-primary">{stageLabel(data.stage)}</p>
    <ol className="mt-6 divide-y divide-border">{STAGES.map((s,i) => { const event = data.milestones.find(m => m.stage === s); const active = STAGES.indexOf(data.stage as typeof STAGES[number]) >= i; return <li key={s} className="flex gap-4 py-4"><span className={`font-mono ${active ? 'text-cleared' : 'text-muted-foreground'}`}>{String(i+1).padStart(2,'0')}</span><div><p>{stageLabel(s)}</p><p className="mt-1 text-xs text-muted-foreground">{event ? new Date(event.at).toLocaleString('en-GB', { timeZone: 'Asia/Dubai' }) + ' GST' : s === 'planned' ? 'Job created' : 'Not recorded'}</p></div></li>; })}</ol>
    <p className="mt-5 text-xs text-muted-foreground">Dispatcher-reported milestones · Not live GPS. {isFetching ? 'Refreshing…' : `Last refreshed ${new Date(dataUpdatedAt).toLocaleTimeString('en-GB', { timeZone: 'Asia/Dubai' })} GST`}</p>
  </>}<a href={`tel:${COMPANY.phone.replaceAll(' ','')}`} className="mt-8 inline-block text-primary">SGM Operations · {COMPANY.phone}</a></main>;
}
