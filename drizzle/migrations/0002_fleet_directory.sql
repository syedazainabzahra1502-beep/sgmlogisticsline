CREATE TABLE public.fleet_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL DEFAULT 'driver' CHECK (kind IN ('driver','vehicle')),
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  plate text NOT NULL DEFAULT '',
  document text NOT NULL DEFAULT '',
  expires_on date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fleet_assets TO authenticated;
GRANT ALL ON public.fleet_assets TO service_role;
ALTER TABLE public.fleet_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fleet select" ON public.fleet_assets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own fleet insert" ON public.fleet_assets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own fleet update" ON public.fleet_assets FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own fleet delete" ON public.fleet_assets FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX fleet_assets_user_idx ON public.fleet_assets(user_id, expires_on);