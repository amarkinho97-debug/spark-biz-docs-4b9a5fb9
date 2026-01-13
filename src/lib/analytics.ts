import { supabase } from "@/integrations/supabase/client";

export const trackEvent = async (
  category: string,
  action: string,
  label?: string,
  metadata?: Record<string, unknown>
) => {
  const payload = {
    category,
    action,
    label,
    metadata: metadata ?? null,
  };

  // Console log for local debugging
  // eslint-disable-next-line no-console
  console.log("📊 TRACK:", { ...payload, timestamp: new Date().toISOString() });

  // Best-effort persistence to backend (non-blocking for UX)
  try {
    await supabase.from("analytics_events").insert([
      {
        category,
        action,
        label: label ?? null,
        metadata: metadata ?? null,
      } as never,
    ] as never);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("Failed to persist analytics event", error);
  }
};
