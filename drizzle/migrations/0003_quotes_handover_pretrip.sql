ALTER TABLE public.operations_jobs DROP CONSTRAINT IF EXISTS operations_jobs_stage_check;
ALTER TABLE public.operations_jobs ADD CONSTRAINT operations_jobs_stage_check CHECK (stage IN ('planned','gate_checked_in','escort_attached','in_transit','ghantoot_handover','abudhabi_escort','site_arrival','delivered'));
ALTER TABLE public.operations_jobs ADD COLUMN IF NOT EXISTS pretrip jsonb;

CREATE OR REPLACE FUNCTION public.authorize_operations_driver(_token uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT jsonb_build_object('id', id, 'user_id', user_id, 'reference', reference, 'origin', origin, 'destination', destination, 'stage', stage, 'details', details, 'documents', documents, 'pod', pod, 'pretrip', pretrip)
 FROM public.operations_jobs WHERE driver_token = _token AND sharing_enabled AND share_expires_at > now()
$$;

CREATE FUNCTION public.save_operations_pretrip(_token uuid, _check jsonb) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 UPDATE public.operations_jobs SET pretrip = _check, updated_at = now()
 WHERE driver_token = _token AND sharing_enabled AND share_expires_at > now() AND pod IS NULL;
 RETURN FOUND;
END
$$;
REVOKE ALL ON FUNCTION public.save_operations_pretrip(uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_operations_pretrip(uuid,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_operations_delivery(_token uuid, _pod jsonb) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 UPDATE public.operations_jobs SET pod = _pod, stage = 'delivered', updated_at = now(), milestones = milestones || jsonb_build_array(jsonb_build_object('stage','delivered','at',now()))
 WHERE driver_token = _token AND sharing_enabled AND share_expires_at > now() AND pod IS NULL AND pretrip IS NOT NULL;
 RETURN FOUND;
END
$$;

CREATE TABLE public.quote_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 company text NOT NULL, contact_name text NOT NULL, email text NOT NULL, phone text NOT NULL,
 origin text NOT NULL, destination text NOT NULL, cargo text NOT NULL,
 weight numeric NOT NULL DEFAULT 0, length numeric NOT NULL DEFAULT 0, width numeric NOT NULL DEFAULT 0, height numeric NOT NULL DEFAULT 0,
 preferred_date text NOT NULL DEFAULT '', notes text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','converted','declined')),
 job_id uuid
);
GRANT SELECT, UPDATE, DELETE ON public.quote_requests TO authenticated;
GRANT ALL ON public.quote_requests TO service_role;
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dispatcher reads quote requests" ON public.quote_requests FOR SELECT TO authenticated USING ((auth.jwt() ->> 'email') = 'info@sgmlogisticsline.com');
CREATE POLICY "Dispatcher updates quote requests" ON public.quote_requests FOR UPDATE TO authenticated USING ((auth.jwt() ->> 'email') = 'info@sgmlogisticsline.com') WITH CHECK ((auth.jwt() ->> 'email') = 'info@sgmlogisticsline.com');
CREATE POLICY "Dispatcher deletes quote requests" ON public.quote_requests FOR DELETE TO authenticated USING ((auth.jwt() ->> 'email') = 'info@sgmlogisticsline.com');
CREATE INDEX quote_requests_created_idx ON public.quote_requests (created_at DESC);