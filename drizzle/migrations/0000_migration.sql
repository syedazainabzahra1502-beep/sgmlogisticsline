CREATE TABLE public.dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  shipment text NOT NULL DEFAULT '',
  cargo text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  status text NOT NULL,
  summary text NOT NULL DEFAULT '',
  missing jsonb NOT NULL DEFAULT '[]',
  risks jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.dispatches TO authenticated;
GRANT ALL ON public.dispatches TO service_role;
ALTER TABLE public.dispatches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own read" ON public.dispatches FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.dispatches FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.dispatches FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX ON public.dispatches (user_id, created_at DESC);