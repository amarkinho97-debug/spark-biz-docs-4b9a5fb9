import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables");
}

async function logEvent(
  supabase: any,
  invoiceId: string,
  eventType: string,
  message: string,
  payload?: unknown,
) {
  const { error } = await supabase.from("audit_logs").insert({
    invoice_id: invoiceId,
    event_type: eventType,
    message,
    payload: payload ?? null,
  });

  if (error) {
    console.error("Failed to write audit log", { eventType, invoiceId, error });
  }
}

serve(async (req) => {
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

    const { invoice_id } = await req.json();

    if (!invoice_id || typeof invoice_id !== "string") {
      return new Response(JSON.stringify({ error: "invoice_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    await logEvent(supabase, invoice_id, "EMISSION_STARTED", "Emissão simulada iniciada", {
      invoice_id,
    });

    // 1) Marca como processando
    const { error: updateProcessingError } = await supabase
      .from("invoices")
      .update({ status: "processing" })
      .eq("id", invoice_id);

    if (updateProcessingError) {
      console.error("Error setting invoice to processing", updateProcessingError);
      await logEvent(supabase, invoice_id, "API_ERROR", "Falha ao atualizar status para processing", {
        error: updateProcessingError,
      });
      return new Response(JSON.stringify({ error: "Failed to update invoice" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Espera 3 segundos simulando latência de API
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 3) Atualiza como emitida com dados simulados
    const protocolNumber = `PROT-${Math.floor(Math.random() * 900000 + 100000)}`;
    const dummyPdfUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
    const dummyXml = "<xml>Simulated Invoice</xml>";

    const { error: updateIssuedError } = await supabase
      .from("invoices")
      .update({
        status: "issued",
        external_pdf_url: dummyPdfUrl,
        xml_content: dummyXml,
        protocol_number: protocolNumber,
      })
      .eq("id", invoice_id);

    if (updateIssuedError) {
      console.error("Error setting invoice to issued", updateIssuedError);
      await logEvent(supabase, invoice_id, "API_ERROR", "Falha ao atualizar status para issued", {
        error: updateIssuedError,
      });
      return new Response(JSON.stringify({ error: "Failed to finalize invoice" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await logEvent(supabase, invoice_id, "EMISSION_SUCCESS", "Emissão simulada concluída", {
      protocol_number: protocolNumber,
      external_pdf_url: dummyPdfUrl,
    });

    return new Response(
      JSON.stringify({ success: true, message: "Invoice queued" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("emit-invoice-mock error", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
