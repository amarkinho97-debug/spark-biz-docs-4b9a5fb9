import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ProfileStatus = "pending" | "active" | "rejected";

export type ApprovalProfile = {
  status: ProfileStatus;
  rejection_reason: string | null;
};

export function useApprovalProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["approval-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("status, rejection_reason")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      return {
        status: (data?.status ?? "pending") as ProfileStatus,
        rejection_reason: (data?.rejection_reason ?? null) as string | null,
      } satisfies ApprovalProfile;
    },
    staleTime: 10_000,
  });
}

// Backwards-compatible helper (used by DashboardLayout)
export function useProfileStatus() {
  const query = useApprovalProfile();
  return {
    ...query,
    data: query.data?.status ?? null,
  } as typeof query & { data: ProfileStatus | null };
}
