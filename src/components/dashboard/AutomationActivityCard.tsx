import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, Bot } from "lucide-react";
import { parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AutomationLog {
  id: string;
  execution_date: string;
  status: string;
  invoices_created_count: number | null;
  affected_contracts: any | null;
  created_at: string;
}

function parseContractsCount(log: AutomationLog): { expected: number; created: number } {
  const created = typeof log.invoices_created_count === "number" ? log.invoices_created_count : 0;

  try {
    const raw: any = log.affected_contracts;
    const items: any[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.contracts)
      ? raw.contracts
      : [];

    const expected = Array.isArray(items) ? items.filter((item) => item != null).length : 0;
    return { expected, created };
  } catch {
    return { expected: 0, created };
  }
}

function toLocalDate(dateStr: string): Date | null {
  try {
    const parsed = parseISO(dateStr);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  } catch {
    return null;
  }
}


function formatExecutionLabel(dateStr: string): string {
  const date = toLocalDate(dateStr);
  if (!date) return "Data inválida";

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const time = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) {
    return `Hoje, ${time}`;
  }

  const day = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

  return `${day} - ${time}`;
}

function getStatusMeta(log: AutomationLog) {
  const { expected, created } = parseContractsCount(log);
  const failures = expected > created ? expected - created : 0;

  if (!expected && !created) {
    return {
      label: "Sem movimentação",
      tone: "neutral" as const,
      description: "Nenhum contrato processado.",
    };
  }

  if (failures === 0 && created > 0 && log.status === "success") {
    return {
      label: "Sucesso",
      tone: "success" as const,
      description: `${created} notas criadas, 0 falhas`,
    };
  }

  if (failures > 0) {
    return {
      label: created === 0 ? "Erro" : "Erro parcial",
      tone: "error" as const,
      description: `${created} notas criadas, ${failures} falhas`,
    };
  }

  return {
    label: log.status === "success" ? "Sucesso" : "Erro",
    tone: log.status === "success" ? ("success" as const) : ("error" as const),
    description: `${created} notas criadas de ${expected} contratos`,
  };
}

function StatusBadge({ tone, label }: { tone: "success" | "error" | "warning" | "neutral"; label: string }) {
  const toneClassMap: Record<typeof tone, string> = {
    success: "bg-success/10 text-success hover:bg-success/15 border-0",
    error: "bg-destructive/10 text-destructive hover:bg-destructive/15 border-0",
    warning: "bg-yellow/10 text-yellow hover:bg-yellow/20 border-0",
    neutral: "bg-muted text-muted-foreground border-0",
  };

  return <Badge className={toneClassMap[tone]}>{label}</Badge>;
}

export function AutomationActivityCard() {
  const { user } = useAuth();

  const {
    data: logs = [],
    isLoading: loading,
  } = useQuery({
    queryKey: ["automation-activity", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as AutomationLog[];

      const { data, error } = await supabase
        .from("automation_logs")
        .select(
          "id, execution_date, status, invoices_created_count, affected_contracts, created_at",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Erro ao carregar atividades de automação", error);
        return [] as AutomationLog[];
      }

      return (data as AutomationLog[]) ?? [];
    },
    enabled: !!user?.id,
  });

  const hasAnyLogs = logs.length > 0;
  const lastExecution = hasAnyLogs ? logs[0] : null;
  const lastMeta = lastExecution ? getStatusMeta(lastExecution) : null;

  return (
    <Card className="bg-card border border-border rounded-2xl card-elevated animate-fade-in">
      <CardHeader className="flex flex-row items-start justify-between pb-4 gap-3">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Bot className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold leading-tight">
              Atividade do Robô
            </CardTitle>
            <p className="text-xs text-muted-foreground max-w-md">
              Acompanhe se a automação recorrente está rodando corretamente.
            </p>

            <div className="mt-2 text-xs flex flex-wrap items-center gap-2">
              {loading ? (
                <Skeleton className="h-4 w-40" />
              ) : lastExecution && lastMeta ? (
                <>
                  <span className="text-muted-foreground/90">
                    Última execução: {formatExecutionLabel(lastExecution.created_at)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs">
                    <StatusBadge tone={lastMeta.tone} label={lastMeta.label} />
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground/90">
                  Nenhuma execução registrada ainda.
                </span>
              )}
            </div>
          </div>
        </div>

        <Link
          to="/dashboard/recorrencia?tab=monitoring"
          className="text-xs font-medium text-primary hover:underline whitespace-nowrap mt-1"
        >
          Ver tudo
        </Link>
      </CardHeader>

      <CardContent className="pt-0">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1 min-w-0">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : !hasAnyLogs ? (
          <p className="text-xs text-muted-foreground">Nenhuma atividade registrada ainda.</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const meta = getStatusMeta(log);
              const { expected, created } = parseContractsCount(log);
              const failures = expected > created ? expected - created : 0;

              const isSuccess = meta.tone === "success";
              const Icon = isSuccess ? CheckCircle2 : AlertTriangle;

              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/40 px-3 py-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        isSuccess ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {formatExecutionLabel(log.created_at)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {failures === 0
                          ? `${created} notas criadas, 0 falhas`
                          : `${created} notas criadas, ${failures} falhas`}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <StatusBadge tone={meta.tone} label={meta.label} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
