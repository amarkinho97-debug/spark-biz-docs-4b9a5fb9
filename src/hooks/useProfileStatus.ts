import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ProfileStatus = "pending" | "active" | string;

export function useProfileStatus() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile-status", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("status")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      return (data?.status ?? null) as ProfileStatus | null;
    },
    staleTime: 10_000,
  });
}
