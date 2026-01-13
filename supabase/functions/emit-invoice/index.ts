import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NUVEM_AUTH_URL = "https://auth.nuvemfiscal.com.br/oauth/token";
const NUVEM_DPS_URL = "https://api.nuvemfiscal.com.br/nfse/dps";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = Deno.env.get("NUVEM_CLIENT_ID")?.trim();
    const clientSecret = Deno.env.get("NUVEM_CLIENT_SECRET")?.trim();

    // Read body once so we can re-use it in both mock and real modes
    const requestBody = await req.json().catch(() => null);

    if (!requestBody) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MOCK MODE: missing credentials
    if (!clientId || !clientSecret) {
      console.warn("[emit-invoice] Running in MOCK MODE (Missing Credentials)");

      // Simulate network latency
      await sleep(1000);

      const mockResponse = {
        id: "mock_123",
        status: "autorizado",
        numero: "2026001",
        protocolo: "PROT-MOCK-99",
        mode: "mock",
      } as const;

      return new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // REAL MODE: call Nuvem Fiscal
    // 1) Auth - client_credentials
    const authParams = new URLSearchParams();
    authParams.set("grant_type", "client_credentials");
    authParams.set("client_id", clientId);
    authParams.set("client_secret", clientSecret);

    const authRes = await fetch(NUVEM_AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: authParams.toString(),
    });

    const authJson = await authRes.json().catch(() => null);

    if (!authRes.ok) {
      console.error("[emit-invoice] Auth error", authJson ?? authRes.statusText);
      return new Response(JSON.stringify({
        error: "Nuvem Fiscal auth failed",
        details: authJson ?? { status: authRes.status, statusText: authRes.statusText },
      }), {
        status: authRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = authJson?.access_token as string | undefined;

    if (!accessToken) {
      console.error("[emit-invoice] Missing access_token in auth response", authJson);
      return new Response(JSON.stringify({
        error: "Nuvem Fiscal auth response missing access_token",
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Emit DPS - forward the infDPS body from the request
    // The frontend can send either `{ infDPS: {...} }` or the root with `infDPS`.
    const dpsPayload =
      (requestBody && requestBody.infDPS)
        ? { infDPS: requestBody.infDPS }
        : requestBody;

    const emitRes = await fetch(NUVEM_DPS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(dpsPayload),
    });

    const emitJson = await emitRes.json().catch(() => null);

    if (!emitRes.ok) {
      console.error("[emit-invoice] Nuvem Fiscal DPS error", emitJson ?? emitRes.statusText);
      return new Response(JSON.stringify({
        error: "Nuvem Fiscal DPS emission failed",
        details: emitJson ?? { status: emitRes.status, statusText: emitRes.statusText },
      }), {
        status: emitRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(emitJson ?? {}), {
      status: emitRes.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[emit-invoice] Internal error", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
