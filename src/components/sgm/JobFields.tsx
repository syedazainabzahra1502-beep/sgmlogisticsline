import type { Details } from '@/lib/operations';
export function JobField({ label, value, onChange, type = 'text', required = false }: { label: string; value: string | number; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return <label className="block min-w-0"><span className="text-xs text-muted-foreground">{label}</span><input aria-label={label} className="field mt-1" type={type} min={type === 'number' ? 0 : undefined} step={type === 'number' ? 'any' : undefined} value={value} required={required} onChange={e => onChange(e.target.value)} /></label>;
}
export function DetailsFields({ d, set, fields }: { d: Details; set: (d: Details) => void; fields: [keyof Details, string, string?][] }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{fields.map(([key, label, type]) => <JobField key={key} label={label} type={type ?? 'text'} value={String(d[key])} onChange={v => set({ ...d, [key]: type === 'number' ? Number(v) : v })} />)}</div>;
}
export const gst = (v: string) => v ? `${v}+04:00` : '';