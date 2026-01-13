import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing environment variables");
    }

    // Usar service role para ter permissões administrativas
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Ler body opcionalmente para permitir target_date, contract_ids, source e flags de execução
    let processingDate = new Date();
    let targetDate: string | undefined;
    let contractIdsFilter: string[] | undefined;
    let source: string | undefined;
    let isForce = false;

    try {
      let body: any = null;

      if (req.body) {
        body = await req.json().catch(() => null as any);
      }
      
      if (body && typeof body.source === "string") {
        source = body.source;
      }
      
      // Flags de execução manual / forçada
      if (body) {
        const manualFlag = body.manual === true;
        const forceFlag = body.force === true;
        isForce = manualFlag || forceFlag;
      }
      
      // Aceitar target_date para reprocessamento de datas passadas
      if (body && typeof body.target_date === "string") {
        const rawTarget = body.target_date as string;
        const parsed = new Date(rawTarget);
        if (isNaN(parsed.getTime())) {
          return new Response(
            JSON.stringify({ success: false, error: "Invalid target_date. Use ISO format YYYY-MM-DD." }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }
        targetDate = rawTarget;
        processingDate = parsed;
      }

      // Aceitar contract_ids para processamento seletivo
      if (body && Array.isArray(body.contract_ids) && body.contract_ids.length > 0) {
        contractIdsFilter = body.contract_ids as string[];
      }
    } catch (_err) {
      // Se o body não for JSON, ignoramos e seguimos com a data atual
    }

    const currentDay = processingDate.getDate();

    console.log(
      `Processing recurring invoices for day ${currentDay} (target_date: ${
        targetDate ?? "today"
      })`,
    );

    // Buscar contratos ativos para processamento
    // Regras de seleção:
    // - target_date definido (reprocessamento manual):
    //     * se não houver contract_ids: buscar contratos ativos cujo charge_day corresponde ao dia de processingDate
    //     * se houver contract_ids: usar apenas os contratos informados, sem filtrar por charge_day
    //     * em ambos os casos, ignorar completamente qualquer lógica baseada em next_launch
    // - Execução normal (cron):
    //     * se isForce === true: todos contratos ativos com auto_issue = true
    //     * se isForce === false: contratos ativos com auto_issue = true e charge_day = dia atual
    const processingDateStr = processingDate.toISOString().slice(0, 10);

    let contractsQuery = supabaseAdmin
      .from("recurring_contracts")
      .select(`
        id,
        user_id,
        client_id,
        amount,
        service_description,
        charge_day,
        contract_name,
        is_vip,
        clients (
          cnpj,
          razao_social
        )
      `)
      .eq("status", "active")
      .eq("auto_issue", true);

    // Se contract_ids fornecido, filtrar apenas esses
    if (contractIdsFilter && contractIdsFilter.length > 0) {
      contractsQuery = contractsQuery.in("id", contractIdsFilter);
    }

    if (targetDate) {
      // Reprocessamento de data específica: usar charge_day como filtro principal
      if (!contractIdsFilter || contractIdsFilter.length === 0) {
        contractsQuery = contractsQuery.eq("charge_day", currentDay);
      }
    } else if (!isForce) {
      // Execução normal (cron, não forçada): apenas contratos com dia de cobrança igual ao dia atual
      contractsQuery = contractsQuery.eq("charge_day", currentDay);
    }

    const { data: contracts, error: contractsError } = await contractsQuery;

    if (contractsError) {
      console.error("Error fetching contracts:", contractsError);
      throw contractsError;
    }

    if (!contracts || contracts.length === 0) {
      console.log("No contracts to process for this date");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No contracts to process",
          processed: 0,
          target_date: processingDate.toISOString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    console.log(`Found ${contracts.length} contracts to process`);

    const results: any[] = [];
    let successCount = 0;
    let errorCount = 0;

    type ContractResult = {
      contract_id: string;
      client_name: string | null;
      amount: number;
      status: "success" | "error" | "skipped";
      is_vip: boolean;
      error_msg: string | null;
      target_date: string;
    };

    type UserStats = {
      userId: string;
      invoices: ContractResult[];
      successCount: number;
      errorCount: number;
    };

    // Estatísticas por usuário para registrar em automation_logs
    const perUserStats = new Map<string, UserStats>();

    // Limites de mês para evitar duplicação de notas no mesmo mês
    const year = processingDate.getFullYear();
    const month = processingDate.getMonth();
    const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)).toISOString();
    const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)).toISOString();
    const targetDateStr = processingDate.toISOString().slice(0, 10);

    // Processar cada contrato
    for (const contract of contracts) {
      try {
        const clientName = (contract as any).clients?.[0]?.razao_social ??
          (contract as any).clients?.razao_social ??
          null;
        const amount = Number((contract as any).amount) || 0;
        const isVip = Boolean((contract as any).is_vip) || amount >= 10000;

        // A seleção de contratos (incluindo qualquer agendamento futuro)
        // é feita na query inicial. Aqui apenas aplicamos o "gap check"
        // com base no mês/ano de processingDate.


        // Verificar se já existe uma nota gerada neste mês para este contrato
        const { data: existingInvoice } = await supabaseAdmin
          .from("invoices")
          .select("id")
          .eq("recurring_contract_id", contract.id)
          .gte("data_emissao", startOfMonth)
          .lte("data_emissao", endOfMonth)
          .maybeSingle();

        if (existingInvoice) {
          console.log(
            `Invoice already exists for contract ${contract.id} in this month (target_date)`,
          );

          const result: ContractResult = {
            contract_id: contract.id,
            client_name: clientName,
            amount,
            status: "skipped",
            is_vip: isVip,
            error_msg: "Nota já emitida para este período",
            target_date: targetDateStr,
          };

          results.push(result);

          const existingStats: UserStats = perUserStats.get(contract.user_id) ?? {
            userId: contract.user_id,
            invoices: [] as ContractResult[],
            successCount: 0,
            errorCount: 0,
          };
          existingStats.invoices.push(result);
          perUserStats.set(contract.user_id, existingStats);

          continue;
        }

        // Criar nova nota fiscal
        const { data: newInvoice, error: invoiceError } = await supabaseAdmin
          .from("invoices")
          .insert({
            user_id: contract.user_id,
            client_id: contract.client_id,
            recurring_contract_id: contract.id,
            valor: contract.amount,
            descricao_servico: contract.service_description,
            data_emissao: processingDate.toISOString(),
            status: "draft",
          })
          .select()
          .single();

        if (invoiceError) {
          console.error(`Error creating invoice for contract ${contract.id}:`, invoiceError);
          errorCount++;

          const result: ContractResult = {
            contract_id: contract.id,
            client_name: clientName,
            amount,
            status: "error",
            is_vip: isVip,
            error_msg: invoiceError.message ?? "Erro ao criar nota fiscal",
            target_date: targetDateStr,
          };

          results.push(result);

          const existingStats: UserStats = perUserStats.get(contract.user_id) ?? {
            userId: contract.user_id,
            invoices: [] as ContractResult[],
            successCount: 0,
            errorCount: 0,
          };
          existingStats.errorCount++;
          existingStats.invoices.push(result);
          perUserStats.set(contract.user_id, existingStats);

          continue;
        }

        // Registrar no audit log por nota individual
        await supabaseAdmin.from("audit_logs").insert({
          invoice_id: newInvoice.id,
          event_type: "auto_generated",
          message: `Nota gerada automaticamente pelo contrato recorrente: ${contract.contract_name}`,
          payload: {
            contract_id: contract.id,
            contract_name: contract.contract_name,
            charge_day: contract.charge_day,
            generated_at: new Date().toISOString(),
          },
        });

        successCount++;

        const result: ContractResult = {
          contract_id: contract.id,
          client_name: clientName,
          amount,
          status: "success",
          is_vip: isVip,
          error_msg: null,
          target_date: targetDateStr,
        };

        results.push(result);

        const existingStats: UserStats = perUserStats.get(contract.user_id) ?? {
          userId: contract.user_id,
          invoices: [] as ContractResult[],
          successCount: 0,
          errorCount: 0,
        };
        existingStats.successCount++;
        existingStats.invoices.push(result);
        perUserStats.set(contract.user_id, existingStats);

        console.log(
          `Successfully created invoice ${newInvoice.id} for contract ${contract.id}`,
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error processing contract ${contract.id}:`, errorMessage);
        errorCount++;

        const clientName = (contract as any).clients?.[0]?.razao_social ??
          (contract as any).clients?.razao_social ??
          null;
        const amount = Number((contract as any).amount) || 0;
        const isVip = Boolean((contract as any).is_vip) || amount >= 10000;

        const result: ContractResult = {
          contract_id: contract.id,
          client_name: clientName,
          amount,
          status: "error",
          is_vip: isVip,
          error_msg: errorMessage,
          target_date: targetDateStr,
        };
        results.push(result);

        const existingStats: UserStats = perUserStats.get(contract.user_id) ?? {
          userId: contract.user_id,
          invoices: [] as ContractResult[],
          successCount: 0,
          errorCount: 0,
        };
        existingStats.errorCount++;
        existingStats.invoices.push(result);
        perUserStats.set(contract.user_id, existingStats);
      }
    }

    // Registrar resumo da execução em automation_logs (uma linha por usuário afetado)
    try {
      const automationLogs = Array.from(perUserStats.values()).map((userStat) => ({
        user_id: userStat.userId,
        execution_date: targetDateStr,
        status: userStat.errorCount > 0 ? "error" : "success",
        invoices_created_count: userStat.successCount,
        error_message:
          userStat.errorCount > 0
            ? `Erros em ${userStat.errorCount} contratos durante processamento automático.`
            : null,
        affected_contracts: userStat.invoices,
      }));

      if (automationLogs.length > 0) {
        const { error: automationError } = await supabaseAdmin
          .from("automation_logs")
          .insert(automationLogs);

        if (automationError) {
          console.error("Error inserting automation logs:", automationError);
        }
      }
    } catch (logError) {
      console.error("Unexpected error while writing automation logs:", logError);
    }

    const processed = results.length;

    const response = {
      success: errorCount === 0,
      processed,
      details: results.map((r) => ({
        client: r.client_name,
        status: r.status,
        message: r.error_msg ?? null,
      })),
      message: `Processed ${contracts.length} contracts`,
      target_date: processingDate.toISOString(),
      summary: {
        total: contracts.length,
        success: successCount,
        errors: errorCount,
        skipped: results.filter((r) => r.status === "skipped").length,
      },
      results,
    };

    console.log("Processing complete:", response.summary);

    // Enviar alerta por e-mail se houver falha
    if (errorCount > 0 || !response.success) {
      try {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");

        // Identificar usuários afetados com erro
        const affectedUserStats = Array.from(perUserStats.values()).filter(
          (u) => u.errorCount > 0,
        );

        if (affectedUserStats.length > 0) {
          const affectedUserIds = affectedUserStats.map((u) => u.userId);

          // Buscar configurações de alerta por usuário (email/webhook)
          const { data: alertSettings, error: alertError } = await supabaseAdmin
            .from("alert_settings")
            .select("user_id, email, email_enabled, webhook_url, webhook_enabled")
            .in("user_id", affectedUserIds);

          if (alertError) {
            console.error("Failed to load alert settings", alertError);
          }

          const settingsByUser = new Map<string, any>();
          (alertSettings ?? []).forEach((s: any) => {
            settingsByUser.set(s.user_id, s);
          });

          // Agrupar contratos com falha por usuário com base nas estatísticas
          for (const userStat of affectedUserStats) {
            const userSettings = settingsByUser.get(userStat.userId);
            const userFailedContracts = (userStat.invoices || []).filter(
              (c) => c.status === "error",
            );

            const contractsListText =
              userFailedContracts.length > 0
                ? userFailedContracts
                    .map((c) =>
                      `${c.client_name || "Cliente desconhecido"} (Contrato: ${c.contract_id})`,
                    )
                    .join(", ")
                : "N/A";

            const technicalError =
              userFailedContracts[0]?.error_msg ?? "Erro não especificado";

            // Enviar e-mail, se configurado
            if (resendApiKey && userSettings?.email_enabled && userSettings.email) {
              const emailHtml = `
                <h2>⚠️ Alerta Qontax: Falha na Recorrência</h2>
                <p>Ocorreu um erro na execução de hoje.</p>
                <p><strong>Contratos afetados:</strong> ${contractsListText}</p>
                <p><strong>Erro técnico:</strong> ${technicalError}</p>
                <h3>Resumo da execução:</h3>
                <ul>
                  <li>Total de contratos: ${response.summary.total}</li>
                  <li>Sucesso: ${response.summary.success}</li>
                  <li>Erros: ${response.summary.errors}</li>
                  <li>Pulados: ${response.summary.skipped}</li>
                </ul>
                <p>Acesse o Monitoramento para reprocessar, se necessário.</p>
              `;

              try {
                await fetch("https://api.resend.com/emails", {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${resendApiKey}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    from: "Qontax <onboarding@resend.dev>",
                    to: [userSettings.email],
                    subject: "⚠️ Alerta Qontax: Falha na Recorrência",
                    html: emailHtml,
                  }),
                });

                console.log(`Alert email sent to ${userSettings.email}`);
              } catch (sendError) {
                console.error("Failed to send alert email for user", userStat.userId, sendError);
              }
            }

            // Enviar webhook, se configurado
            if (userSettings?.webhook_enabled && userSettings.webhook_url) {
              try {
                await fetch(userSettings.webhook_url, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    type: "recurring_invoices_failed",
                    user_id: userStat.userId,
                    execution_date: processingDate.toISOString(),
                    summary: response.summary,
                    failed_contracts: userFailedContracts,
                  }),
                });

                console.log(`Alert webhook sent to ${userSettings.webhook_url}`);
              } catch (webhookError) {
                console.error("Failed to send alert webhook for user", userStat.userId, webhookError);
              }
            }
          }
        }
      } catch (emailError) {
        console.error("Failed to process alerts for recurring invoices:", emailError);
        // Não falhar a função inteira se o alerta não for enviado
      }
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Function error:", errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 200 
      }
    );
  }
});
