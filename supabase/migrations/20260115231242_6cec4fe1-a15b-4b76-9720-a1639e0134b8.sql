-- Tighten overly permissive RLS policies flagged by the linter

-- 1) analytics_events: allow inserts, but avoid WITH CHECK (true)
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.analytics_events;
CREATE POLICY "Public can insert analytics events (scoped)"
ON public.analytics_events
FOR INSERT
TO public
WITH CHECK (
  auth.uid() IS NOT NULL
  OR anonymous_id IS NOT NULL
);

-- 2) nbs_codes: only admins can manage reference data
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.nbs_codes;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.nbs_codes;

CREATE POLICY "Admins can insert nbs codes"
ON public.nbs_codes
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update nbs codes"
ON public.nbs_codes
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
