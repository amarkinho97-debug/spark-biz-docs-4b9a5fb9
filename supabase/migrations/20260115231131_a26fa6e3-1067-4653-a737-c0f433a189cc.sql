-- Add approval status to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- Backfill any existing rows that might have NULL (in case column existed without NOT NULL)
UPDATE public.profiles
SET status = 'pending'
WHERE status IS NULL;

-- Ensure any existing admins keep access immediately
UPDATE public.profiles p
SET status = 'active'
WHERE EXISTS (
  SELECT 1
  FROM public.user_roles ur
  WHERE ur.user_id = p.id
    AND ur.role = 'admin'
);

-- Optional safety: if an admin profile row doesn't exist yet, create it from auth.users
-- (May be skipped if profiles are always created at signup)
INSERT INTO public.profiles (id, email, status)
SELECT u.id, u.email, 'active'
FROM auth.users u
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id AND ur.role = 'admin'
)
AND NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);