-- Admin management audit table (note: public.audit_logs already exists for invoice/client events)
-- Create a dedicated table for admin approval audits matching the requested fields.

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  admin_email text NOT NULL,
  target_user_id uuid NOT NULL,
  target_email text,
  action text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_audit_logs_action_allowed CHECK (action IN ('approved','rejected','resubmitted'))
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read admin audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can read admin audit logs"
ON public.admin_audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can insert admin audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert admin audit logs"
ON public.admin_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND auth.uid() = admin_id
);

-- Ensure profiles columns exist (idempotent)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE public.profiles
ALTER COLUMN status SET DEFAULT 'pending';

UPDATE public.profiles
SET status = 'pending'
WHERE status IS NULL
   OR status NOT IN ('pending','active','rejected');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_status_allowed'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_status_allowed;
  END IF;

  ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_allowed
  CHECK (status IN ('pending','active','rejected'));
END $$;