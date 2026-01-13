import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null as any);

    if (!body) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      email,
      send_email = true,
      webhook_url,
      send_webhook = false,
    }: {
      email?: string | null;
      send_email?: boolean;
      webhook_url?: string | null;
      send_webhook?: boolean;
    } = body;

    const contractsListText =
      body.contracts_list ||
      "Contrato de teste (use o painel de monitoramento para ver execuções reais).";

    const technicalError =
      body.technical_error ||
      "Este é um alerta de teste disparado manualmente a partir do painel de monitoramento.";

    const emailHtml = `
      <h2>⚠️ Alerta Qontax: Falha na Recorrência (Teste)</h2>
      <p>Ocorreu um erro simulado na automação de recorrência.</p>
      <p><strong>Contratos afetados:</strong> ${contractsListText}</p>
      <p><strong>Erro técnico:</strong> ${technicalError}</p>
      <p>Acesse o Monitoramento para validar se o alerta foi recebido corretamente.</p>
    `;

    const results: { email?: string; webhook_url?: string } = {};

    if (send_email && email) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Qontax <onboarding@resend.dev>",
          to: [email],
          subject: "⚠️ Alerta Qontax: Falha na Recorrência (Teste)",
          html: emailHtml,
        }),
      });

      results.email = email;
    }

    if (send_webhook && webhook_url) {
      await fetch(webhook_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "recurring_invoices_failed_test",
          message: "Teste de alerta de automação de notas recorrentes",
          contracts_list: contractsListText,
          technical_error: technicalError,
        }),
      });

      results.webhook_url = webhook_url;
    }

    return new Response(JSON.stringify({
      ok: true,
      sent: results,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in send-alert-test function", error);

    return new Response(JSON.stringify({ error: "Internal error", details: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
