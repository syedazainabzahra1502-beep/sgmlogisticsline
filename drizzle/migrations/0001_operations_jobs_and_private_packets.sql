CREATE TABLE public.operations_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid(),
 reference text NOT NULL,
 origin text NOT NULL,
 destination text NOT NULL,
 customer text NOT NULL DEFAULT '',
 stage text NOT NULL DEFAULT 'planned' CHECK (stage IN ('planned','gate_checked_in','escort_attached','in_transit','delivered')),
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 documents jsonb NOT NULL DEFAULT '[]'::jsonb,
 milestones jsonb NOT NULL DEFAULT '[]'::jsonb,
 pod jsonb,
 client_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
 driver_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
 share_expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
 sharing_enabled boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operations_jobs TO authenticated;
GRANT ALL ON public.operations_jobs TO service_role;
ALTER TABLE public.operations_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "operations own read" ON public.operations_jobs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "operations own insert" ON public.operations_jobs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "operations own update" ON public.operations_jobs FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "operations own delete" ON public.operations_jobs FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX operations_jobs_owner ON public.operations_jobs (user_id, created_at DESC);
CREATE POLICY "dispatch files own read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'dispatch-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "dispatch files own upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'dispatch-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "dispatch files own delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'dispatch-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE FUNCTION public.read_operations_tracking(_token uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT jsonb_build_object('reference', reference, 'origin', origin, 'destination', destination, 'stage', stage, 'milestones', milestones, 'updated_at', updated_at)
 FROM public.operations_jobs WHERE client_token = _token AND sharing_enabled AND share_expires_at > now()
$$;
REVOKE ALL ON FUNCTION public.read_operations_tracking(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_operations_tracking(uuid) TO anon, authenticated, service_role;
CREATE FUNCTION public.authorize_operations_driver(_token uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT jsonb_build_object('id', id, 'user_id', user_id, 'reference', reference, 'origin', origin, 'destination', destination, 'stage', stage, 'details', details, 'documents', documents, 'pod', pod)
 FROM public.operations_jobs WHERE driver_token = _token AND sharing_enabled AND share_expires_at > now()
$$;
REVOKE ALL ON FUNCTION public.authorize_operations_driver(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.authorize_operations_driver(uuid) TO service_role;
CREATE FUNCTION public.complete_operations_delivery(_token uuid, _pod jsonb) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
 BEGIN
 UPDATE public.operations_jobs SET pod = _pod, stage = 'delivered', updated_at = now(), milestones = milestones || jsonb_build_array(jsonb_build_object('stage','delivered','at',now()))
 WHERE driver_token = _token AND sharing_enabled AND share_expires_at > now() AND pod IS NULL;
 RETURN FOUND;
 END
$$;
REVOKE ALL ON FUNCTION public.complete_operations_delivery(uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_operations_delivery(uuid,jsonb) TO service_role;