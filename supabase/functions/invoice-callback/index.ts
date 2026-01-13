import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { invoice_id, status, pdf_url, xml_content } = body ?? {};

    if (!invoice_id || typeof invoice_id !== "string") {
      return new Response(JSON.stringify({ error: "invoice_id is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl!, serviceRoleKey!);

    const updatePayload: Record<string, unknown> = {
      status: status === "authorized" ? "issued" : "processing",
    };

    if (typeof pdf_url === "string") {
      updatePayload.external_pdf_url = pdf_url;
    }

    if (typeof xml_content === "string") {
      updatePayload.xml_content = xml_content;
    }

    const { error } = await supabaseAdmin
      .from("invoices")
      .update(updatePayload)
      .eq("id", invoice_id);

    if (error) {
      console.error("Error updating invoice from callback", error);
      return new Response(JSON.stringify({ error: "Failed to update invoice" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("invoice-callback function error", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
