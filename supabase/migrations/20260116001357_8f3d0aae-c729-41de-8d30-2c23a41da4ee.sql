-- 1) Profiles: add rejection_reason and constrain status values
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Ensure status has a safe default
ALTER TABLE public.profiles
ALTER COLUMN status SET DEFAULT 'pending';

-- Backfill any invalid/NULL values to 'pending'
UPDATE public.profiles
SET status = 'pending'
WHERE status IS NULL
   OR status NOT IN ('pending','active','rejected');

-- Add/replace a CHECK constraint for allowed statuses
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


-- 2) New table for account approval audit (note: public.audit_logs already exists for invoices)
CREATE TABLE IF NOT EXISTS public.approval_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  action_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT approval_audit_logs_action_allowed CHECK (action_type IN ('approve','reject'))
);

ALTER TABLE public.approval_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read logs
DROP POLICY IF EXISTS "Admins can read approval audit logs" ON public.approval_audit_logs;
CREATE POLICY "Admins can read approval audit logs"
ON public.approval_audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Only admins can write logs, and admin_id must match the actor
DROP POLICY IF EXISTS "Admins can insert approval audit logs" ON public.approval_audit_logs;
CREATE POLICY "Admins can insert approval audit logs"
ON public.approval_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND auth.uid() = admin_id
);


-- 3) Tighten profiles RLS: status/rejection_reason should not be publicly readable
-- Remove overly-permissive public SELECT policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;

-- Allow users to read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow admins to read all profiles (needed for /admin)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Allow admins to update status/rejection_reason
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
