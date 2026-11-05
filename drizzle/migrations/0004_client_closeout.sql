CREATE FUNCTION public.read_operations_closeout(_token uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT jsonb_build_object('id', id, 'user_id', user_id, 'reference', reference, 'customer', customer, 'details', details, 'pod', pod)
 FROM public.operations_jobs WHERE client_token = _token AND sharing_enabled AND share_expires_at > now() AND pod IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.read_operations_closeout(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_operations_closeout(uuid) TO service_role;