import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Repeat, CalendarDays, AlertTriangle, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Slash } from "lucide-react";
import { Plus, Edit, Pause, Play } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { RecurringContractForm } from "@/components/dashboard/RecurringContractForm";
import { toast } from "@/hooks/use-toast";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

type RecurringContract = {
  id: string;
  contract_name: string;
  amount: number;
  charge_day: number;
  service_description: string;
  status: string;
  client_id: string;
  auto_issue: boolean;
  is_vip: boolean;
  clients: {
    razao_social: string;
  };
};

type InvoiceCalendarEntry = {
  id: string;
  data_emissao: string;
  status: "draft" | "issued" | "processing" | "cancelled";
  recurring_contract_id: string | null;
};

type ContractInvoice = {
  id: string;
  created_at: string;
  status: "draft" | "issued" | "processing" | "cancelled";
  valor: number;
  external_pdf_url: string | null;
  numero_nota: string | null;
};

export default function Recorrencia() {
  const { user } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<RecurringContract | null>(null);
  const [activeTab, setActiveTab] = useState<"gestao" | "calendario" | "monitoramento">("gestao");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<RecurringContract | null>(null);

  const today = useMemo(() => new Date(), []);
  const todayDay = today.getDate();
  const [viewDate, setViewDate] = useState(() => new Date());
  const [reprocessDate, setReprocessDate] = useState<string>("");
  const [selectedAlertContracts, setSelectedAlertContracts] = useState<Set<string>>(new Set());
  const [logsStatusFilter, setLogsStatusFilter] = useState<"all" | "success" | "error" | "skipped">("all");
  const [logsDatePreset, setLogsDatePreset] = useState<"7d" | "30d" | "current-month" | "custom">("7d");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [highlightReprocessAction, setHighlightReprocessAction] = useState(false);
  const [searchParams] = useSearchParams();
  const [showOnlyVip, setShowOnlyVip] = useState(false);
  const [showOnlyVipMissing, setShowOnlyVipMissing] = useState(false);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "monitoring") {
      setActiveTab("monitoramento");
    }

    const filter = searchParams.get("filter");
    if (filter === "error") {
      setLogsStatusFilter("error");
    } else if (filter === "success") {
      setLogsStatusFilter("success");
    }

    const action = searchParams.get("action");
    if (action === "reprocess") {
      setHighlightReprocessAction(true);
    }
  }, [searchParams]);

  const { data: contracts, isLoading, refetch } = useQuery({
    queryKey: ["recurring-contracts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_contracts")
        .select(`
          *,
          clients (
            razao_social
          )
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as RecurringContract[];
    },
    enabled: !!user?.id,
  });

  const { data: calendarInvoices } = useQuery({
    queryKey: [
      "recurring-invoices-calendar",
      user?.id,
      viewDate.getFullYear(),
      viewDate.getMonth(),
    ],
    queryFn: async () => {
      if (!user?.id) return [] as InvoiceCalendarEntry[];

      const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).toISOString();
      const end = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1).toISOString();

      const { data, error } = await supabase
        .from("invoices")
        .select("id, data_emissao, status, recurring_contract_id")
        .eq("user_id", user.id)
        .gte("data_emissao", start)
        .lt("data_emissao", end);

      if (error) throw error;
      return data as InvoiceCalendarEntry[];
    },
    enabled: !!user?.id,
  });

  const { data: contractInvoices, isLoading: isHistoryLoading } = useQuery({
    queryKey: ["contract-invoices", selectedContract?.id],
    queryFn: async () => {
      if (!selectedContract?.id || !user?.id) return [] as ContractInvoice[];

      const { data, error } = await supabase
        .from("invoices")
        .select("id, created_at, status, valor, external_pdf_url, numero_nota, recurring_contract_id")
        .eq("recurring_contract_id", selectedContract.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ContractInvoice[];
    },
    enabled: !!selectedContract?.id && !!user?.id && detailsOpen,
  });

  const { data: lastAutoRun, isLoading: isLastRunLoading } = useQuery({
    queryKey: ["recurring-last-run", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("audit_logs")
        .select("created_at, invoice_id")
        .eq("event_type", "auto_generated")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as { created_at: string; invoice_id: string } | null;
    },
    enabled: !!user?.id,
  });

  type MonthlyInvoiceEntry = {
    id: string;
    data_emissao: string;
    status: "draft" | "issued" | "processing" | "cancelled";
    recurring_contract_id: string | null;
    client_id: string | null;
  };
 
   const { data: monthlyInvoices } = useQuery({
     queryKey: [
       "recurring-invoices-month-current",
       user?.id,
       today.getFullYear(),
       today.getMonth(),
     ],
     queryFn: async () => {
       if (!user?.id) return [] as MonthlyInvoiceEntry[];
 
       const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
       const end = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString();
 
      const { data, error } = await supabase
        .from("invoices")
        .select("id, data_emissao, status, recurring_contract_id, client_id")
        .eq("user_id", user.id)
         .gte("data_emissao", start)
         .lt("data_emissao", end);
 
       if (error) throw error;
       return data as MonthlyInvoiceEntry[];
     },
     enabled: !!user?.id,
   });

  type AutomationLog = {
    id: string;
    execution_date: string;
    status: string;
    invoices_created_count: number;
    error_message: string | null;
    affected_contracts: any | null;
    created_at: string;
    alert_sent: boolean;
    alert_timestamp: string | null;
  };

  type ParsedAffectedContract = {
    id: string;
    clientName: string;
    amount: number | null;
    status: "success" | "error" | "skipped" | "unknown";
    errorMessage: string | null;
    isVip: boolean;
    targetDate: string | null;
  };

  const [selectedLog, setSelectedLog] = useState<AutomationLog | null>(null);
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState(false);

  type AlertSettings = {
    id: string;
    user_id: string;
    email: string | null;
    email_enabled: boolean;
    webhook_url: string | null;
    webhook_enabled: boolean;
  };

  const toBrazilDate = (dateString: string) => {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    // Ajusta o horário para o fuso de São Paulo (UTC-3),
    // independentemente do fuso configurado no navegador
    date.setHours(date.getHours() - 3);
    return date;
  };

  const {
    data: alertSettings,
    isLoading: isAlertSettingsLoading,
    refetch: refetchAlertSettings,
  } = useQuery({
    queryKey: ["alert-settings", user?.id],
    queryFn: async () => {
      if (!user?.id) return null as AlertSettings | null;

      const { data, error } = await supabase
        .from("alert_settings")
        .select("id, user_id, email, email_enabled, webhook_url, webhook_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as AlertSettings | null;
    },
    enabled: !!user?.id,
  });

  const [alertEmail, setAlertEmail] = useState("");
  const [alertEmailEnabled, setAlertEmailEnabled] = useState(true);
  const [alertWebhookUrl, setAlertWebhookUrl] = useState("");
  const [alertWebhookEnabled, setAlertWebhookEnabled] = useState(false);

  useEffect(() => {
    if (alertSettings) {
      setAlertEmail(alertSettings.email ?? "");
      setAlertEmailEnabled(alertSettings.email_enabled ?? true);
      setAlertWebhookUrl(alertSettings.webhook_url ?? "");
      setAlertWebhookEnabled(alertSettings.webhook_enabled ?? false);
    }
  }, [alertSettings]);

  const saveAlertSettingsMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const payload = {
        user_id: user.id,
        email: alertEmail || null,
        email_enabled: alertEmailEnabled,
        webhook_url: alertWebhookUrl || null,
        webhook_enabled: alertWebhookEnabled,
      };

      const { error } = await supabase.from("alert_settings").upsert(payload, {
        onConflict: "user_id",
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      await refetchAlertSettings();
      toast({
        title: "Configurações salvas",
        description: "Suas preferências de alerta foram atualizadas.",
      });
    },
    onError: (err: any) => {
      console.error("Erro ao salvar configurações de alerta", err);
      toast({
        title: "Erro ao salvar",
        description:
          err?.message || "Não foi possível salvar as configurações de alerta.",
        variant: "destructive",
      });
    },
  });

  const testAlertMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const hasEmailChannel = alertEmailEnabled && !!alertEmail;
      const hasWebhookChannel = alertWebhookEnabled && !!alertWebhookUrl;

      if (!hasEmailChannel && !hasWebhookChannel) {
        throw new Error(
          "Ative pelo menos um canal de alerta (e-mail ou webhook) para executar o teste.",
        );
      }

      const { error } = await supabase.functions.invoke("send-alert-test", {
        body: {
          email: hasEmailChannel ? alertEmail : null,
          send_email: hasEmailChannel,
          webhook_url: hasWebhookChannel ? alertWebhookUrl : null,
          send_webhook: hasWebhookChannel,
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Alerta de teste enviado",
        description:
          "Verifique sua caixa de entrada ou o destino do webhook para confirmar o recebimento.",
      });
    },
    onError: (err: any) => {
      console.error("Erro ao enviar alerta de teste", err);
      toast({
        title: "Erro ao enviar teste",
        description:
          err?.message || "Não foi possível enviar o alerta de teste.",
        variant: "destructive",
      });
    },
  });

  const {
    data: automationLogs,
    isLoading: isLogsLoading,
    refetch: refetchLogs,
  } = useQuery({
    queryKey: [
      "automation-logs",
      user?.id,
      logsDatePreset,
      customStartDate?.toISOString() ?? null,
      customEndDate?.toISOString() ?? null,
    ],
    queryFn: async () => {
      if (!user?.id) return [] as AutomationLog[];

      const now = new Date();
      let startDate: Date | null = null;
      let endDate: Date | null = null;

      if (logsDatePreset === "7d") {
        endDate = now;
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 6);
      } else if (logsDatePreset === "30d") {
        endDate = now;
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 29);
      } else if (logsDatePreset === "current-month") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      } else if (logsDatePreset === "custom" && customStartDate && customEndDate) {
        startDate = customStartDate;
        endDate = customEndDate;
      }

      let query = supabase
        .from("automation_logs")
        .select(
          "id, execution_date, status, invoices_created_count, error_message, affected_contracts, created_at, alert_sent, alert_timestamp",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (startDate) {
        const start = startDate.toISOString().slice(0, 10);
        query = query.gte("execution_date", start);
      }

      if (endDate) {
        const end = endDate.toISOString().slice(0, 10);
        query = query.lte("execution_date", end);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AutomationLog[];
    },
    enabled: !!user?.id,
  });

  const automationLogsArray = automationLogs ?? [];

  const recurrencePerformanceData = useMemo(
    () =>
      automationLogsArray
        .slice()
        .reverse()
        .map((log) => {
          const date = toBrazilDate(log.execution_date) ?? new Date(log.execution_date);
          const label = date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          });

          const raw = log.affected_contracts as any;
          const contractsList = Array.isArray(raw)
            ? raw
            : Array.isArray(raw?.contracts)
              ? raw.contracts
              : [];

          const expected = contractsList.length;
          const created = log.invoices_created_count ?? 0;

          return {
            label,
            expected,
            created,
          };
        }),
    [automationLogsArray],
  );

  const { weeklySuccessRate, recentFailures } = useMemo(() => {
    if (!automationLogsArray.length) {
      return { weeklySuccessRate: null as number | null, recentFailures: 0 };
    }

    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (logsDatePreset === "7d") {
      endDate = now;
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 6);
    } else if (logsDatePreset === "30d") {
      endDate = now;
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 29);
    } else if (logsDatePreset === "current-month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (logsDatePreset === "custom" && customStartDate && customEndDate) {
      startDate = customStartDate;
      endDate = customEndDate;
    }

    let totalExpected = 0;
    let totalCreated = 0;
    let failures = 0;

    automationLogsArray.forEach((log) => {
      const date = new Date(log.execution_date);
      if (startDate && date < startDate) return;
      if (endDate && date > endDate) return;

      const raw = log.affected_contracts as any;
      const contractsList = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.contracts)
          ? raw.contracts
          : [];

      const expected = contractsList.length;
      const created = log.invoices_created_count ?? 0;

      totalExpected += expected;
      totalCreated += created;

      if (log.status !== "success") {
        failures += 1;
      }
    });

    const rate = totalExpected > 0 ? Math.round((totalCreated / totalExpected) * 100) : null;

    return { weeklySuccessRate: rate, recentFailures: failures };
  }, [automationLogsArray, logsDatePreset, customStartDate, customEndDate]);

  const filteredAutomationLogs = useMemo(() => {
    if (!Array.isArray(automationLogsArray) || !automationLogsArray.length) {
      return [] as AutomationLog[];
    }

    // Sempre trabalhar sobre uma cópia defensiva, ignorando entradas nulas
    let base = automationLogsArray.filter((log): log is AutomationLog => Boolean(log));

    if (logsStatusFilter === "success") {
      base = base.filter((log) => log.status === "success");
    } else if (logsStatusFilter === "error") {
      base = base.filter((log) => log.status === "error");
    } else if (logsStatusFilter === "skipped") {
      base = base.filter((log) => log.status === "skipped");
    }

    if (showOnlyVip) {
      base = base.filter((log) => {
        if (!log) return false;

        let affected: ParsedAffectedContract[] = [];
        try {
          affected = parseAffectedContracts(log);
        } catch (error) {
          console.error("Erro ao processar contratos afetados para filtro VIP", {
            logId: (log as any)?.id,
            error,
          });
          return false;
        }

        if (!Array.isArray(affected) || affected.length === 0) {
          return false;
        }

        // Garantir acesso seguro à propriedade isVip
        return affected.some((contract) => contract && Boolean(contract.isVip));
      });
    }

    return base;
  }, [automationLogsArray, logsStatusFilter, showOnlyVip]);
  const parseAffectedContracts = (log: AutomationLog | null): ParsedAffectedContract[] => {
    try {
      if (!log) return [];

      const raw: any = (log as any).affected_contracts;
      if (!raw) return [];

      const itemsRaw: any[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.contracts)
          ? raw.contracts
          : [];

      if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) {
        return [];
      }

      const items = itemsRaw.filter((item) => item !== null && typeof item === "object");

      return items.map((item: any, index: number) => {
        const amount = typeof item?.amount === "number" ? item.amount : null;

        const errorMessage =
          item?.error_msg ??
          item?.error_message ??
          item?.error ??
          null;

        let status: "success" | "error" | "skipped" | "unknown" = "unknown";
        if (item?.status === "success") {
          status = "success";
        } else if (item?.status === "error" || errorMessage) {
          status = "error";
        } else if (item?.status === "skipped") {
          status = "skipped";
        }

        const isVip = Boolean(item?.is_vip ?? item?.isVip);
        const targetDate = typeof item?.target_date === "string" ? item.target_date : null;

        return {
          id: String(item?.contract_id ?? item?.id ?? index),
          clientName:
            item?.client_name ??
            item?.client?.razao_social ??
            item?.client?.name ??
            item?.client_id ??
            `Contrato ${index + 1}`,
          amount,
          status,
          errorMessage,
          isVip,
          targetDate,
        };
      });
    } catch (error) {
      console.error("Erro ao fazer parse de affected_contracts", {
        logId: (log as any)?.id,
        error,
      });
      return [];
    }
  };
  const monitoringStats = useMemo(() => {
    if (!filteredAutomationLogs.length) {
      return {
        totalProcessed: 0,
        success: 0,
        error: 0,
        skipped: 0,
      };
    }

    let totalProcessed = 0;
    let success = 0;
    let error = 0;
    let skipped = 0;

    filteredAutomationLogs.forEach((log) => {
      const affected = parseAffectedContracts(log);
      totalProcessed += affected.length;

      affected.forEach((contract) => {
        if (contract.status === "success") success += 1;
        else if (contract.status === "error") error += 1;
        else if (contract.status === "skipped") skipped += 1;
      });
    });

    return { totalProcessed, success, error, skipped };
  }, [filteredAutomationLogs]);

  const missingContractsHistory = useMemo(() => {
    const historyMap = new Map<string, { date: string; status: ParsedAffectedContract["status"] }[]>();

    automationLogsArray.forEach((log) => {
      const affected = parseAffectedContracts(log);

      affected.forEach((contract) => {
        const list = historyMap.get(contract.id) ?? [];
        list.push({ date: log.execution_date, status: contract.status });
        historyMap.set(contract.id, list);
      });
    });

    // Ordena por data decrescente e limita aos 3 mais recentes por contrato
    historyMap.forEach((list, contractId) => {
      const sorted = [...list].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      historyMap.set(contractId, sorted.slice(0, 3));
    });

    return historyMap;
  }, [automationLogsArray, parseAffectedContracts]);

  const getErrorContractIdsFromCurrentFilter = (): string[] => {
    const ids = new Set<string>();

    filteredAutomationLogs.forEach((log) => {
      const affected = parseAffectedContracts(log);
      affected.forEach((contract) => {
        if (contract.status === "error") {
          ids.add(contract.id);
        }
      });
    });

    return Array.from(ids);
  };

  const handleReprocessSelected = async () => {
    if (!user?.id || selectedAlertContracts.size === 0) return;
 
    try {
      const contractIds = Array.from(selectedAlertContracts);
 
      const { data, error } = await supabase.functions.invoke(
        "process-recurring-invoices",
        {
          body: { contract_ids: contractIds, force: true, target_date: new Date().toISOString() },
        },
      );

      if (error) throw error;

      const generated = data?.summary?.success ?? 0;

      toast({
        title: "Reprocessamento concluído",
        description: `${generated} notas geradas com sucesso para os contratos selecionados.`,
      });

      setSelectedAlertContracts(new Set());
      await Promise.all([refetch(), refetchLogs()]);
    } catch (error: any) {
      console.error("Erro ao reprocessar selecionados", error);
      toast({
        title: "Erro no reprocessamento",
        description: error.message || "Não foi possível reprocessar os contratos.",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (contractId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    
    const { error } = await supabase
      .from("recurring_contracts")
      .update({ status: newStatus })
      .eq("id", contractId);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do contrato.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Status atualizado",
      description: `Contrato ${newStatus === "active" ? "ativado" : "pausado"} com sucesso.`,
    });
    
    refetch();
  };

  const handleEdit = (contract: RecurringContract) => {
    setEditingContract(contract);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingContract(null);
    refetch();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const pendingApprovals = (contracts || []).filter(
    (contract) =>
      !contract.auto_issue &&
      contract.status === "active" &&
      contract.charge_day === todayDay,
  );

  const activeContracts = (contracts || []).filter(
    (contract) => contract.status === "active",
  );

  const totalActiveAmount = activeContracts.reduce(
    (sum, contract) => sum + contract.amount,
    0,
  );

  const upcomingCharges = activeContracts
    .map((contract) => {
      const now = today;
      let year = now.getFullYear();
      let month = now.getMonth();
      const day = contract.charge_day;

      let nextDate = new Date(year, month, day);
      if (nextDate < now) {
        if (month === 11) {
          year += 1;
          month = 0;
        } else {
          month += 1;
        }
        nextDate = new Date(year, month, day);
      }

      return { contract, date: nextDate };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  const todayActiveAutoContracts = activeContracts.filter(
    (contract) => contract.auto_issue && contract.charge_day === todayDay,
  );

  const expectedToday = todayActiveAutoContracts.length;

  const createdToday = (monthlyInvoices || []).filter((invoice) => {
    if (!invoice.recurring_contract_id) return false;

    const emissionDate = toBrazilDate(invoice.data_emissao);
    if (!emissionDate) return false;

    return (
      emissionDate.getFullYear() === today.getFullYear() &&
      emissionDate.getMonth() === today.getMonth() &&
      emissionDate.getDate() === todayDay &&
      todayActiveAutoContracts.some(
        (contract) => contract.id === invoice.recurring_contract_id,
      )
    );
  }).length;

  const successRate = expectedToday > 0 ? Math.round((createdToday / expectedToday) * 100) : null;

  const alertedContracts = activeContracts.filter((contract) => {
    // Contratos ativos com dia de cobrança já alcançado no mês atual
    if (contract.charge_day > todayDay) return false;

    if (showOnlyVipMissing && !contract.is_vip) return false;

    const hasInvoiceThisMonth = (monthlyInvoices || []).some((invoice) => {
      if (invoice.recurring_contract_id) {
        return invoice.recurring_contract_id === contract.id;
      }
      return invoice.client_id === contract.client_id;
    });

    return !hasInvoiceThisMonth;
  });

  const handleApproveAndEmit = async (contract: RecurringContract) => {
    if (!user?.id) return;

    const { error } = await supabase.from("invoices").insert({
      user_id: user.id,
      client_id: contract.client_id,
      descricao_servico: contract.service_description,
      valor: contract.amount,
      status: "issued",
      data_emissao: new Date().toISOString(),
      recurring_contract_id: contract.id,
    });

    if (error) {
      toast({
        title: "Erro ao emitir",
        description:
          "Não foi possível criar a nota deste contrato. Tente novamente em instantes.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Contrato emitido",
      description: "A nota foi criada e já aparece no painel financeiro.",
    });
  };

  const openDetails = (contract: RecurringContract) => {
    setSelectedContract(contract);
    setDetailsOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const renderGestaoTab = () => (
    <div className="space-y-6">
      {pendingApprovals.length > 0 && (
        <Card className="border-yellow-500/40 bg-yellow-500/5">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <CardTitle className="text-base">Aprovações pendentes para hoje</CardTitle>
                <CardDescription>
                  Revise e aprove os contratos manuais antes da emissão automática.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingApprovals.map((contract) => (
              <div
                key={contract.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitial(contract.clients.razao_social)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {contract.clients.razao_social} — {contract.contract_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(contract.amount)} · Hoje ({contract.charge_day})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(contract)}
                  >
                    Editar valor/data
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApproveAndEmit(contract)}
                  >
                    Aprovar e emitir
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!contracts || contracts.length === 0 ? (
        <Card className="mx-auto max-w-xl border-dashed bg-muted/30">
          <CardHeader className="pb-6 pt-8 text-center md:pb-8 md:pt-10">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 md:h-16 md:w-16">
              <CalendarDays className="h-7 w-7 text-primary md:h-8 md:w-8" />
            </div>
            <CardTitle className="text-base md:text-lg">Nenhum contrato ativo</CardTitle>
            <CardDescription className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground md:text-sm">
              Configure contratos recorrentes para automatizar suas cobranças mensais e reduzir trabalho manual.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8 text-center md:pb-10">
            <Button
              onClick={() => setIsFormOpen(true)}
              className="h-10 px-6 text-sm md:h-11 md:px-8"
            >
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Contrato
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Dia da Cobrança</TableHead>
                  <TableHead>Modo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((contract) => (
                  <TableRow
                    key={contract.id}
                    className="cursor-pointer"
                    onClick={() => openDetails(contract)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitial(contract.clients.razao_social)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{contract.clients.razao_social}</span>
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="max-w-[200px]">
                        <p className="truncate font-medium">{contract.contract_name}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {contract.service_description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold" onClick={(e) => e.stopPropagation()}>
                      {formatCurrency(contract.amount)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <span className="text-sm">Todo dia {contract.charge_day}</span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Badge
                        variant={contract.auto_issue ? "default" : "secondary"}
                      >
                        {contract.auto_issue ? "Automático" : "Aprovação manual"}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Badge
                        variant={contract.status === "active" ? "default" : "secondary"}
                      >
                        {contract.status === "active" ? "Ativo" : "Pausado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(contract)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleToggleStatus(contract.id, contract.status)
                          }
                        >
                          {contract.status === "active" ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );

  const renderCalendarTab = () => {
    if (!contracts || contracts.length === 0) {
      return (
        <Card className="flex min-h-[220px] flex-col items-center justify-center gap-2 px-4 py-6 text-center md:min-h-[260px] md:py-8">
          <CalendarDays className="h-6 w-6 text-muted-foreground md:h-8 md:w-8" />
          <CardTitle className="text-sm md:text-base">Nenhum contrato para exibir</CardTitle>
          <CardDescription className="text-xs text-muted-foreground md:text-sm">
            Crie um contrato recorrente para visualizar o calendário de cobranças.
          </CardDescription>
        </Card>
      );
    }

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const firstWeekDay = firstDayOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (number | null)[] = [];
    for (let i = 0; i < firstWeekDay; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(d);
    }

    const invoices = calendarInvoices || [];

    const isFutureMonth =
      year > today.getFullYear() ||
      (year === today.getFullYear() && month > today.getMonth());

    const isPastMonth =
      year < today.getFullYear() ||
      (year === today.getFullYear() && month < today.getMonth());

    const getDayStatus = (day: number) => {
      const contractsForDay = (contracts || []).filter(
        (c) => c.status === "active" && c.charge_day === day,
      );

      if (contractsForDay.length === 0) return null;

      const invoicesForDay = invoices.filter((invoice) => {
        if (invoice.status !== "issued") return false;

        const emissionDate = toBrazilDate(invoice.data_emissao);
        if (!emissionDate) return false;

        const emissionYear = emissionDate.getFullYear();
        const emissionMonth = emissionDate.getMonth();
        const emissionDay = emissionDate.getDate();

        if (emissionYear !== year || emissionMonth !== month || emissionDay !== day) {
          return false;
        }

        return contractsForDay.some(
          (contract) => contract.id === invoice.recurring_contract_id,
        );
      });

      if (invoicesForDay.length > 0) {
        return "success";
      }

      if (isFutureMonth) {
        return "future";
      }

      if (isPastMonth) {
        return "missed";
      }

      if (day > todayDay) {
        return "future";
      }

      if (day < todayDay) {
        return "missed";
      }

      return "future";
    };

    const statusToColor: Record<string, string> = {
      success: "bg-emerald-500",
      future: "bg-amber-500",
      missed: "bg-red-500",
    };

    const statusToLabel: Record<string, string> = {
      success: "Fatura emitida",
      future: "Agendado / pendente",
      missed: "Atrasado (sem emissão)",
    };

    return (
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Calendário de cobranças</CardTitle>
            <CardDescription className="hidden text-sm text-muted-foreground sm:block">
              Visão mensal das datas de cobrança dos seus contratos recorrentes.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-1 text-xs font-medium">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                  setViewDate((prev) =>
                    new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                  )
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[120px] text-center">
                {viewDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                  setViewDate((prev) =>
                    new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                  )
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Fatura emitida
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Agendado / pendente
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                Atrasado
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="pb-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-sm">
            {cells.map((day, index) => {
              if (!day) return <div key={index} />;
              const status = getDayStatus(day);
              return (
                <button
                  key={index}
                  type="button"
                  className="flex h-16 flex-col items-center justify-start rounded-md border bg-background p-1 text-xs hover:bg-muted/60"
                >
                  <span className="mb-1 self-start text-[11px] text-muted-foreground">
                    {day}
                  </span>
                  {status && (
                    <div className="mt-auto flex flex-col items-center gap-1">
                      <span
                        className={`h-2 w-2 rounded-full ${statusToColor[status]}`}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {statusToLabel[status]}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderMonitoringTab = () => (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Status da automação</CardTitle>
            <CardDescription className="text-xs">
              Execução diária às 08:00 (UTC)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Última execução:</span>{" "}
              {isLastRunLoading
                ? "Carregando..."
                : lastAutoRun
                  ? new Date(lastAutoRun.created_at).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })
                  : "Ainda não executada"}
            </p>
            <p>
              <span className="text-muted-foreground">Próxima execução:</span>{" "}
              {(() => {
                const now = new Date();
                const next = new Date();
                next.setUTCHours(8, 0, 0, 0);
                if (next <= now) {
                  next.setUTCDate(next.getUTCDate() + 1);
                }
                return next.toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                });
              })()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Resumo de hoje</CardTitle>
            <CardDescription className="text-xs">
              Dia {todayDay} — contratos automáticos ativos
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Esperadas</p>
              <p className="text-lg font-semibold">{expectedToday}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Criadas</p>
              <p className="text-lg font-semibold">{createdToday}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sucesso</p>
              <p className="text-lg font-semibold">
                {successRate !== null ? `${successRate}%` : "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Forçar sincronização</CardTitle>
            <CardDescription className="text-xs">
              Executa a automação agora para o dia de hoje.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-end">
            <Button
              onClick={handleRunAutomationNow}
              className="w-full"
              variant="cta"
              size="lg"
            >
              <Repeat className="mr-2 h-4 w-4" />
              Executar automação agora
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Performance da recorrência</CardTitle>
            <CardDescription className="text-xs">
              Comparativo entre contratos esperados e notas criadas por execução.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {!recurrencePerformanceData.length ? (
              <p className="text-xs text-muted-foreground">
                Ainda não há dados suficientes para exibir o gráfico.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recurrencePerformanceData} barGap={4} barCategoryGap={16}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload || !payload.length) return null;
                      const expected = payload.find((p: any) => p.dataKey === "expected")?.value ?? 0;
                      const created = payload.find((p: any) => p.dataKey === "created")?.value ?? 0;

                      return (
                        <div className="rounded-md border bg-background px-2 py-1 text-xs shadow-sm">
                          <p className="font-medium">{label}</p>
                          <p>Esperadas: {expected}</p>
                          <p>Criadas: {created}</p>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    formatter={(value) => (
                      <span className="text-[11px] text-muted-foreground">
                        {value === "expected" ? "Esperadas" : "Criadas"}
                      </span>
                    )}
                  />
                  <Bar
                    dataKey="expected"
                    name="Esperadas"
                    fill="hsl(var(--chart-1))"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="created"
                    name="Criadas"
                    fill="hsl(var(--chart-2))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Indicadores recentes</CardTitle>
            <CardDescription className="text-xs">
              Visão rápida da última semana de execuções.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Taxa de sucesso semanal</p>
              <p className="text-lg font-semibold">
                {weeklySuccessRate !== null ? `${weeklySuccessRate}%` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Falhas recentes (7 dias)</p>
              <p className="text-lg font-semibold">{recentFailures}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {alertedContracts.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="flex w-full flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <CardTitle className="text-sm">Contratos sem emissão neste mês</CardTitle>
              <CardDescription className="text-xs">
                Ativos para o dia {todayDay} ou anteriores, mas sem notas registradas no mês atual.
              </CardDescription>
            </div>
            <div className="flex w-full flex-col gap-3 mt-4 md:mt-0 md:w-auto md:flex-row md:items-center md:justify-end">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span>⭐ Apenas VIPs</span>
                <Switch
                  checked={showOnlyVipMissing}
                  onCheckedChange={(checked) => setShowOnlyVipMissing(Boolean(checked))}
                />
              </div>
              {selectedAlertContracts.size > 0 && (
                <Button
                  onClick={handleReprocessSelected}
                  size="sm"
                  variant={highlightReprocessAction ? "cta" : "default"}
                  className="w-full md:w-auto"
                >
                  <Repeat className="mr-2 h-4 w-4" />
                  Reprocessar selecionados ({selectedAlertContracts.size})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {alertedContracts.map((contract) => {
              const history = missingContractsHistory.get(contract.id) ?? [];

              return (
                <div
                  key={contract.id}
                  className="flex flex-col gap-2 rounded-md border bg-card px-3 py-2 text-sm md:flex-row md:items-center"
                >
                  <div className="flex items-start gap-3 md:flex-1">
                    <Checkbox
                      checked={selectedAlertContracts.has(contract.id)}
                      onCheckedChange={(checked) => {
                        const newSet = new Set(selectedAlertContracts);
                        if (checked) {
                          newSet.add(contract.id);
                        } else {
                          newSet.delete(contract.id);
                        }
                        setSelectedAlertContracts(newSet);
                      }}
                    />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{contract.clients.razao_social}</p>
                        {contract.is_vip && (
                          <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
                            ⭐ VIP
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{contract.contract_name}</p>
                      {history.length > 0 && (
                        <div className="mt-1 space-y-1 text-[11px] text-muted-foreground">
                          <p className="font-medium">Mini-histórico (últimas {history.length} execuções)</p>
                          <div className="flex flex-wrap gap-2">
                            {history.map((entry, index) => (
                              <span
                                key={`${contract.id}-${index}`}
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
                                  entry.status === "success" && "border-emerald-500/40 bg-emerald-500/5 text-emerald-600",
                                  entry.status === "error" && "border-destructive/40 bg-destructive/5 text-destructive",
                                  entry.status === "skipped" && "border-muted/60 bg-muted/40 text-muted-foreground",
                                )}
                              >
                                <span>{new Date(entry.date).toLocaleDateString("pt-BR")}</span>
                                <span>
                                  {entry.status === "success"
                                    ? "Sucesso"
                                    : entry.status === "error"
                                    ? "Falha"
                                    : entry.status === "skipped"
                                    ? "Já emitido"
                                    : "Desconhecido"}
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1 md:pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDetails(contract)}
                    >
                      Ver histórico
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
        <Card className="max-w-[100vw] overflow-hidden p-2 md:p-6">
          <CardHeader className="pb-2">
            <div className="mb-4 flex flex-col gap-4 md:mb-0 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-sm">Histórico de execuções</CardTitle>
              <div className="flex w-full flex-col gap-2 text-[11px] text-muted-foreground md:flex-row md:items-center md:justify-end">
                <div className="flex w-full items-center gap-2 md:w-auto">
                  <span>Filtro:</span>
                  <select
                    value={logsStatusFilter}
                    onChange={(e) => setLogsStatusFilter(e.target.value as any)}
                    className="h-8 w-full rounded-md border bg-background px-2 text-[11px] md:w-40"
                  >
                    <option value="all">Todos</option>
                    <option value="success">Sucesso</option>
                    <option value="error">Falha</option>
                  </select>
                </div>
                <div className="flex w-full items-center gap-2 md:w-auto">
                  <span>Período:</span>
                  <select
                    value={logsDatePreset}
                    onChange={(e) => {
                      const value = e.target.value as typeof logsDatePreset;
                      setLogsDatePreset(value);
                      if (value !== "custom") {
                        setCustomStartDate(undefined);
                        setCustomEndDate(undefined);
                      }
                    }}
                    className="h-8 w-full rounded-md border bg-background px-2 text-[11px] md:w-40"
                  >
                    <option value="7d">Últimos 7 dias</option>
                    <option value="30d">Últimos 30 dias</option>
                    <option value="current-month">Mês atual</option>
                    <option value="custom">Customizado</option>
                  </select>
                </div>
                <div className="flex w-full items-center gap-2 py-1 md:w-auto">
                  <span className="text-xs">⭐ Apenas VIPs</span>
                  <Switch
                    checked={showOnlyVip}
                    disabled={isLogsLoading || !automationLogsArray.length}
                    onCheckedChange={(checked) => {
                      try {
                        setShowOnlyVip(Boolean(checked));
                      } catch (error) {
                        console.error("Erro ao alternar filtro de VIPs", error);
                      }
                    }}
                  />
                </div>
                {getErrorContractIdsFromCurrentFilter().length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1 w-full sm:mt-0 sm:w-auto"
                    onClick={handleSmartReprocessErrors}
                    disabled={isLogsLoading}
                  >
                    <Repeat className="mr-1 h-3 w-3" />
                    Reprocessar críticas
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {logsDatePreset === "custom" && (
              <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="text-muted-foreground">De:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 min-w-[120px] justify-start px-2 text-[11px] font-normal",
                        !customStartDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarDays className="mr-1 h-3 w-3" />
                      {customStartDate ? format(customStartDate, "dd/MM/yyyy") : "Início"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={(date) => {
                        setCustomStartDate(date ?? undefined);
                        setLogsDatePreset("custom");
                      }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">até</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 min-w-[120px] justify-start px-2 text-[11px] font-normal",
                        !customEndDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarDays className="mr-1 h-3 w-3" />
                      {customEndDate ? format(customEndDate, "dd/MM/yyyy") : "Fim"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={(date) => {
                        setCustomEndDate(date ?? undefined);
                        setLogsDatePreset("custom");
                      }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {filteredAutomationLogs.length > 0 && (
              <div className="grid grid-cols-2 gap-3 text-[11px] md:grid-cols-4">
                <div className="rounded-md border bg-card px-3 py-2">
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <span>Total execuções</span>
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {filteredAutomationLogs.length}
                  </p>
                </div>

                <div className="rounded-md border bg-card px-3 py-2">
                  <p className="flex items-center gap-1 text-[11px] text-emerald-600">
                    <span>✅ Sucesso</span>
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {monitoringStats.success}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setLogsStatusFilter("error")}
                  className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-left transition hover:bg-destructive/10"
                >
                  <p className="flex items-center gap-1 text-[11px] text-destructive">
                    <span>⚠️ Falhas</span>
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {monitoringStats.error}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setLogsStatusFilter("skipped")}
                  className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-left transition hover:bg-amber-500/10"
                >
                  <p className="flex items-center gap-1 text-[11px] text-amber-600">
                    <span>⏭️ Pulados</span>
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {monitoringStats.skipped}
                  </p>
                </button>
              </div>
            )}

            {isLogsLoading ? (
              <p className="text-xs text-muted-foreground">Carregando...</p>
            ) : !automationLogsArray || automationLogsArray.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhuma execução registrada ainda.
              </p>
            ) : filteredAutomationLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhuma execução encontrada para o filtro selecionado.
              </p>
            ) : (
              <div className="max-h-72 w-full overflow-x-auto overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[110px]">Data alvo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[90px] text-right">Notas</TableHead>
                      <TableHead>Erro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAutomationLogs.map((log) => (
                      <TableRow
                        key={log.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setSelectedLog(log);
                          setIsLogDrawerOpen(true);
                        }}
                      >
        <TableCell>
                          {(toBrazilDate(log.execution_date) ?? new Date(log.execution_date)).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              log.status === "success" ? "default" : "destructive"
                            }
                          >
                            {log.status === "success" ? "Sucesso" : "Erro"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {log.invoices_created_count}
                        </TableCell>
                        <TableCell className="max-w-xs text-xs text-muted-foreground">
                          {log.error_message ? log.error_message : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Reprocessar data específica</CardTitle>
            <CardDescription className="text-xs">
              Corrija dias passados que não tiveram notas geradas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1 text-xs">
              <label className="text-muted-foreground" htmlFor="reprocess-date">
                Escolha a data de referência
              </label>
              <input
                id="reprocess-date"

                type="date"
                value={reprocessDate}
                onChange={(e) => setReprocessDate(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-2 text-xs"
              />
            </div>
            <Button
              onClick={handleReprocessSpecificDate}
              className="w-full"
              size="sm"
              disabled={!reprocessDate}
            >
              <Repeat className="mr-2 h-4 w-4" />
              Reprocessar esta data
            </Button>
            <p className="text-[11px] text-muted-foreground">
              A automação será executada como se o dia atual fosse a data selecionada,
              evitando duplicar notas no mesmo mês.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Configurações de alerta</CardTitle>
          <CardDescription className="text-xs">
            Defina para onde os alertas de falha da automação serão enviados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1 flex-1">
                <Label htmlFor="alert-email" className="text-xs">E-mail do administrador</Label>
                <Input
                  id="alert-email"
                  type="email"
                  placeholder="seu-email@empresa.com"
                  value={alertEmail}
                  onChange={(e) => setAlertEmail(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="flex flex-col items-end justify-center gap-1">
                <span className="text-[11px] text-muted-foreground">Alertas por e-mail</span>
                <Switch
                  checked={alertEmailEnabled}
                  onCheckedChange={(checked) => setAlertEmailEnabled(Boolean(checked))}
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Quando houver falha na recorrência, enviaremos um resumo para este e-mail.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1 flex-1">
                <Label htmlFor="alert-webhook" className="text-xs">Webhook (Slack, Discord, etc.)</Label>
                <Input
                  id="alert-webhook"
                  type="url"
                  placeholder="https://hooks.slack.com/..."
                  value={alertWebhookUrl}
                  onChange={(e) => setAlertWebhookUrl(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="flex flex-col items-end justify-center gap-1">
                <span className="text-[11px] text-muted-foreground">Alertas via webhook</span>
                <Switch
                  checked={alertWebhookEnabled}
                  onCheckedChange={(checked) => setAlertWebhookEnabled(Boolean(checked))}
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Enviaremos um POST em JSON com detalhes da falha para esta URL.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-[11px] text-muted-foreground">
              <p>
                Use os botões abaixo para salvar e testar as configurações atuais.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => saveAlertSettingsMutation.mutate()}
                disabled={isAlertSettingsLoading || saveAlertSettingsMutation.isPending}
              >
                Salvar configurações
              </Button>
              <Button
                variant="default"
                size="sm"
                className="text-xs"
                onClick={() => testAlertMutation.mutate()}
                disabled={testAlertMutation.isPending}
              >
                Enviar alerta de teste
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Sheet open={isLogDrawerOpen} onOpenChange={setIsLogDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Detalhes da execução</SheetTitle>
            <SheetDescription>
              Visualize os contratos afetados e o status desta execução automática.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3 text-sm">
            {selectedLog && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Data alvo: {(toBrazilDate(selectedLog.execution_date) ?? new Date(selectedLog.execution_date)).toLocaleDateString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Status: {selectedLog.status === "success" ? "Sucesso" : "Erro"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Notas criadas: {selectedLog.invoices_created_count}
                </p>
                {selectedLog.error_message && (
                  <p className="text-xs text-destructive">Erro: {selectedLog.error_message}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Contratos afetados</p>
              {(() => {
                const affected = parseAffectedContracts(selectedLog);

                if (!affected.length) {
                  return (
                    <p className="text-[11px] text-muted-foreground">
                      Nenhum contrato detalhado para esta execução.
                    </p>
                  );
                }

                return (
                  <div className="space-y-2">
                    {affected.map((contract) => (
                      <div
                        key={contract.id}
                        className={cn(
                          "flex items-start justify-between gap-3 rounded-md border bg-card px-3 py-2",
                          contract.status === "error" && "border-destructive/50 bg-destructive/5",
                          contract.status === "success" && "border-emerald-500/40 bg-emerald-500/5",
                        )}
                      >
                        <div className="space-y-1">
                          <p className="flex items-center gap-2 text-sm font-semibold">
                            {contract.clientName}
                            {contract.isVip && (
                              <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
                                ⭐ VIP
                              </span>
                            )}
                          </p>
                          {contract.errorMessage && (
                            <div className="mt-1 rounded-md bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
                              {contract.errorMessage}
                            </div>
                          )}
                        </div>
                        <div className="mt-1 flex flex-col items-end gap-1 text-xs font-medium">
                          <span
                            className="inline-flex items-center gap-1"
                          >
                            {contract.status === "success" ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                <span className="text-emerald-500">Sucesso</span>
                              </>
                            ) : contract.status === "error" ? (
                              <>
                                <XCircle className="h-3 w-3 text-destructive" />
                                <span className="text-destructive">Falha</span>
                              </>
                            ) : contract.status === "skipped" ? (
                              <>
                                <Slash className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">Já emitido</span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">Desconhecido</span>
                            )}
                          </span>
                          {contract.amount !== null && (
                            <span className="text-xs font-semibold text-foreground">
                              {formatCurrency(contract.amount)}
                            </span>
                          )}
                          {contract.targetDate && (
                            <span className="text-[11px] text-muted-foreground">
                              Data alvo: {(toBrazilDate(contract.targetDate) ?? new Date(contract.targetDate)).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );

  const handleRunAutomationNow = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase.functions.invoke(
        "process-recurring-invoices",
        {
          body: { source: "dashboard" },
        },
      );

      if (error) throw error;

      const summary = data?.summary ?? {};
      const created = summary.success ?? 0;
      const failed = summary.errors ?? 0;
      const skipped = summary.skipped ?? 0;

      toast({
        title: "Automação Concluída",
        description: `✅ ${created} Criadas | ⚠️ ${failed} Falhas | ⏭️ ${skipped} Puladas`,
      });

      await Promise.all([refetch(), refetchLogs()]);
    } catch (err: any) {
      console.error("Erro ao executar automação agora", err);
      toast({
        title: "Erro ao executar automação",
        description: err?.message || "Não foi possível executar a automação.",
        variant: "destructive",
      });
    }
  };

  const handleReprocessSpecificDate = async () => {
    if (!user?.id || !reprocessDate) return;

    try {
      const { data, error } = await supabase.functions.invoke(
        "process-recurring-invoices",
        {
          body: { source: "dashboard-reprocess", target_date: reprocessDate },
        },
      );

      if (error) throw error;

      const generated = data?.summary?.success ?? 0;
      const formatted = new Date(reprocessDate).toLocaleDateString("pt-BR");

      toast({
        title: "Reprocessamento concluído",
        description: `${generated} notas processadas para ${formatted}.`,
      });

      await Promise.all([refetch(), refetchLogs()]);
    } catch (err: any) {
      console.error("Erro ao reprocessar data específica", err);
      toast({
        title: "Erro ao reprocessar",
        description:
          err?.message || "Não foi possível reprocessar a automação para esta data.",
        variant: "destructive",
      });
    }
  };

  const handleSmartReprocessErrors = async () => {
    if (!user?.id) return;

    const contractIds = getErrorContractIdsFromCurrentFilter();

    if (contractIds.length === 0) {
      toast({
        title: "Nenhum contrato crítico",
        description: "Não há contratos com falha no filtro atual.",
      });
      return;
    }

    try {
      toast({
        title: "Reprocessamento iniciado",
        description: `Reprocessando ${contractIds.length} contratos críticos...`,
      });

      const { data, error } = await supabase.functions.invoke(
        "process-recurring-invoices",
        {
          body: { source: "dashboard-smart-reprocess", contract_ids: contractIds },
        },
      );

      if (error) throw error;

      const generated = data?.summary?.success ?? 0;

      toast({
        title: "Reprocessamento concluído",
        description: `${generated} contratos processados a partir do filtro atual.`,
      });

      await Promise.all([refetch(), refetchLogs()]);
    } catch (err: any) {
      console.error("Erro ao reprocessar contratos críticos", err);
      toast({
        title: "Erro ao reprocessar",
        description:
          err?.message || "Não foi possível reprocessar os contratos críticos.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8">
        <div className="flex items-center justify-between">
          <Breadcrumb className="hidden md:block">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/dashboard" className="text-xs text-muted-foreground">
                    Início
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-xs">Gestão de Contratos</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex w-full items-center justify-between md:hidden">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="-ml-2 h-8 px-2 text-xs text-muted-foreground"
            >
              <Link to="/dashboard" className="flex items-center gap-1">
                <ChevronLeft className="h-4 w-4" />
                <span>Início</span>
              </Link>
            </Button>
            <span className="text-xs font-medium text-muted-foreground">Gestão de Contratos</span>
          </div>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight md:text-3xl">Gestão de Contratos</h1>
            <p className="mt-1 hidden text-sm text-muted-foreground md:block">
              Gerencie seus contratos recorrentes e automatize cobranças mensais
            </p>
          </div>
          {contracts && contracts.length > 0 && (
            <Button
              onClick={() => setIsFormOpen(true)}
              className="h-10 w-full text-sm md:h-10 md:w-auto md:px-4"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Contrato
            </Button>
          )}
        </div>

        {contracts && contracts.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Valor recorrente ativo</CardTitle>
                <CardDescription className="text-xs">
                  Soma dos contratos ativos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">
                  {formatCurrency(totalActiveAmount)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Contratos ativos</CardTitle>
                <CardDescription className="text-xs">
                  Quantidade de contratos recorrentes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">
                  {activeContracts.length}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Próximo lançamento</CardTitle>
                <CardDescription className="text-xs">
                  Data e cliente do próximo contrato
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingCharges.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum lançamento futuro encontrado.
                  </p>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {upcomingCharges[0].contract.clients.razao_social}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {upcomingCharges[0].date.toLocaleDateString("pt-BR")} ·{" "}
                      {formatCurrency(upcomingCharges[0].contract.amount)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3 rounded-lg bg-muted p-1 text-xs md:inline-flex md:w-auto">
            <TabsTrigger value="gestao">Gestão</TabsTrigger>
            <TabsTrigger value="calendario">Calendário</TabsTrigger>
            <TabsTrigger value="monitoramento">Monitoramento</TabsTrigger>
          </TabsList>
          <TabsContent value="gestao" className="mt-4">
            {renderGestaoTab()}
          </TabsContent>
          <TabsContent value="calendario" className="mt-4">
            {renderCalendarTab()}
          </TabsContent>
          <TabsContent value="monitoramento" className="mt-4">
            {renderMonitoringTab()}
          </TabsContent>
        </Tabs>

        <RecurringContractForm
          open={isFormOpen}
          onOpenChange={handleFormClose}
          contract={editingContract}
        />

        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl">
            {selectedContract && (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {selectedContract.contract_name} — {selectedContract.clients.razao_social}
                  </DialogTitle>
                </DialogHeader>
                <div className="mt-4 space-y-4">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Valor base</span>
                      <div className="font-medium">
                        {formatCurrency(selectedContract.amount)}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Dia de cobrança</span>
                      <div className="font-medium">Todo dia {selectedContract.charge_day}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Modo</span>
                      <div className="font-medium">
                        {selectedContract.auto_issue
                          ? "Emissão automática"
                          : "Requer aprovação"}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status</span>
                      <div className="font-medium">
                        {selectedContract.status === "active" ? "Ativo" : "Pausado"}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-semibold">Descrição do serviço</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedContract.service_description}
                    </p>
                  </div>

                  <div className="rounded-md border p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">Histórico de emissões</h3>
                      {isHistoryLoading && (
                        <span className="text-xs text-muted-foreground">Carregando...</span>
                      )}
                    </div>
                    {!isHistoryLoading && (!contractInvoices || contractInvoices.length === 0) && (
                      <p className="text-xs text-muted-foreground">
                        Nenhuma nota emitida a partir deste contrato ainda.
                      </p>
                    )}
                    {!isHistoryLoading && contractInvoices && contractInvoices.length > 0 && (
                      <div className="mt-2 max-h-60 overflow-y-auto rounded-md border bg-muted/20">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[120px]">Data</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Nº Nota</TableHead>
                              <TableHead className="text-right">Valor</TableHead>
                              <TableHead className="text-right">Documento</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                          {contractInvoices.map((invoice) => {
                              const emissionDate = toBrazilDate(invoice.created_at) ?? new Date(invoice.created_at);
                              const formattedDate = emissionDate.toLocaleDateString("pt-BR");

                              const statusLabel: Record<ContractInvoice["status"], string> = {
                                draft: "Rascunho",
                                processing: "Processando",
                                issued: "Emitida",
                                cancelled: "Cancelada",
                              };

                              const statusVariant: Record<ContractInvoice["status"], "default" | "secondary" | "destructive" | "outline"> = {
                                draft: "secondary",
                                processing: "secondary",
                                issued: "default",
                                cancelled: "destructive",
                              };

                              return (
                                <TableRow key={invoice.id}>
                                  <TableCell>{formattedDate}</TableCell>
                                  <TableCell>
                                    <Badge variant={statusVariant[invoice.status]}>
                                      {statusLabel[invoice.status]}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{invoice.numero_nota ?? "—"}</TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatCurrency(invoice.valor)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {invoice.external_pdf_url ? (
                                      <a
                                        href={invoice.external_pdf_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-medium text-primary underline"
                                      >
                                        Ver PDF
                                      </a>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">Sem PDF</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
