import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Download, XCircle, Loader2, Plus, Search, ChevronLeft, ChevronRight, CalendarIcon, Code2, DollarSign, TrendingUp, Users } from "lucide-react";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { handleDownloadPdf, PdfInvoiceData } from "@/lib/pdfInvoice";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
} from "recharts";
import { KpiCard } from "@/components/dashboard/KpiCard";


type InvoiceStatus = "draft" | "issued" | "processing" | "cancelled";

interface Invoice {
  id: string;
  numero_nota: string | null;
  descricao_servico: string;
  valor: number;
  discount_unconditional?: number | null;
  status: InvoiceStatus;
  data_emissao: string;
  xml_content: string | null;
  external_pdf_url: string | null;
  protocol_number?: string | null;
  retention_codes?: any;
  clients: {
    razao_social: string;
    cnpj: string;
    email: string | null;
  } | null;
}

interface AuditLog {
  id: string;
  event_type: string;
  message: string | null;
  payload: any | null;
  created_at: string;
}

const ITEMS_PER_PAGE = 10;

export default function Notas() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelingInvoice, setCancelingInvoice] = useState<Invoice | null>(null);

  const [activeTab, setActiveTab] = useState<"todas" | "emitidas" | "rascunhos">("todas");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");



  const fetchInvoices = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("invoices")
      .select(
        `
        *,
        clients (
          razao_social,
          cnpj,
          email
        )
      `
      )
      .eq("user_id", user.id)
      .order("data_emissao", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar as notas.",
      });
    } else {
      setInvoices(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, [user]);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (!error) {
        setIsAdmin(Boolean(data));
      }
    };
    checkAdmin();
  }, [user]);

  useEffect(() => {
    const hasProcessing = invoices.some((inv) => inv.status === "processing");
    if (!hasProcessing) return;

    const intervalId = setInterval(() => {
      fetchInvoices();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [invoices]);

  // Filter and paginate invoices
  const filteredInvoices = useMemo(() => {
    let result = invoices;

    // Filter by status via tabs
    if (activeTab === "emitidas") {
      result = result.filter((inv) => inv.status === "issued");
    } else if (activeTab === "rascunhos") {
      result = result.filter((inv) => inv.status === "draft");
    }

    // Filter by search query (client name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((inv) => inv.clients?.razao_social?.toLowerCase().includes(query));
    }

    // Date range filter
    if (dateFrom || dateTo) {
      result = result.filter((inv) => {
        const date = new Date(inv.data_emissao);
        if (Number.isNaN(date.getTime())) return false;

        if (dateFrom && date < dateFrom) return false;
        if (dateTo) {
          const endOfDay = new Date(dateTo);
          endOfDay.setHours(23, 59, 59, 999);
          if (date > endOfDay) return false;
        }
        return true;
      });
    }

    // Value range filter
    const parseNumber = (value: string) => {
      if (!value.trim()) return NaN;
      return Number(value.replace(/\./g, "").replace(",", "."));
    };

    const min = parseNumber(minValue);
    const max = parseNumber(maxValue);

    if (!Number.isNaN(min) || !Number.isNaN(max)) {
      result = result.filter((inv) => {
        const v = Number(inv.valor);
        if (!Number.isNaN(min) && v < min) return false;
        if (!Number.isNaN(max) && v > max) return false;
        return true;
      });
    }

    return result;
  }, [invoices, activeTab, searchQuery, dateFrom, dateTo, minValue, maxValue]);

  const statusSummary = useMemo(
    () => {
      const base: { key: InvoiceStatus; label: string }[] = [
        { key: "issued", label: "Emitidas" },
        { key: "draft", label: "Rascunhos" },
        { key: "processing", label: "Processando" },
        { key: "cancelled", label: "Canceladas" },
      ];

      return base.map(({ key, label }) => ({
        status: label,
        total: filteredInvoices.filter((inv) => inv.status === key).length,
      }));
    },
    [filteredInvoices],
  );

  const monthlySummary = useMemo(
    () => {
      const map = new Map<string, number>();

      filteredInvoices
        .filter((inv) => inv.status === "issued")
        .forEach((inv) => {
          const d = new Date(inv.data_emissao);
          if (Number.isNaN(d.getTime())) return;
          const key = format(d, "MM/yyyy");
          const current = map.get(key) ?? 0;
          map.set(key, current + Number(inv.valor || 0));
        });

      return Array.from(map.entries())
        .sort(([a], [b]) => {
          const [ma, ya] = a.split("/").map(Number);
          const [mb, yb] = b.split("/").map(Number);
          return ya === yb ? ma - mb : ya - yb;
        })
        .map(([month, total]) => ({ month, total }));
    },
    [filteredInvoices],
  );

  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredInvoices.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredInvoices, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, dateFrom, dateTo, minValue, maxValue]);

  const handleCancel = async () => {
    if (!cancelingInvoice || !user) return;

    try {
      // Log the cancellation action with invoice backup
      const { error: logError } = await supabase.from("audit_logs").insert({
        invoice_id: cancelingInvoice.id,
        event_type: "INVOICE_CANCELLED",
        message: `Invoice ${cancelingInvoice.numero_nota || cancelingInvoice.id} cancelled by user`,
        payload: {
          invoice: cancelingInvoice,
          user_id: user.id,
          timestamp: new Date().toISOString(),
        } as any,
      });

      if (logError) {
        console.error("Failed to log invoice cancellation:", logError);
      }

      const { error } = await supabase
        .from("invoices")
        .update({ status: "cancelled" })
        .eq("id", cancelingInvoice.id);

      if (error) throw error;
      toast({ title: "Nota cancelada com sucesso!" });
      setCancelDialogOpen(false);
      fetchInvoices();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Erro ao cancelar nota.",
      });
    }
  };

  const generatePDF = async (invoice: Invoice) => {
    if (!user) return;

    const clientInfo = invoice.clients
      ? {
          razaoSocial: invoice.clients.razao_social,
          cnpj: invoice.clients.cnpj,
          email: invoice.clients.email,
        }
      : null;

    const retention = (invoice.retention_codes || {}) as any;

    const desconto = Number(invoice.discount_unconditional || 0);
    const issValor = Number(retention.iss?.amount) || 0;
    const pisValor = Number(retention.pis?.amount) || 0;
    const cofinsValor = Number(retention.cofins?.amount) || 0;
    const inssValor = Number(retention.inss?.amount) || 0;
    const irValor = Number(retention.ir?.amount) || 0;
    const csllValor = Number(retention.csll?.amount) || 0;

    const totalRetencoesFederais =
      pisValor + cofinsValor + inssValor + irValor + csllValor;

    const valorLiquido = Math.max(
      Number(invoice.valor) - desconto - issValor - totalRetencoesFederais,
      0,
    );

    const pdfInvoice: PdfInvoiceData = {
      id: invoice.id,
      numeroNota: invoice.numero_nota,
      descricaoServico: invoice.descricao_servico,
      valor: Number(invoice.valor),
      status: invoice.status,
      dataEmissao: invoice.data_emissao,
      client: clientInfo,
      clientCity: (invoice as any).clients?.cidade ?? null,
      clientUf: (invoice as any).clients?.estado ?? null,
      clientIbgeCode: (invoice as any).service_location_code ?? null,
      naturezaOperacao: (invoice as any).operation_nature ?? undefined,
      desconto,
      issValor,
      pisValor,
      cofinsValor,
      inssValor,
      irValor,
      csllValor,
      totalRetencoes: totalRetencoesFederais,
      valorLiquido,
      officialPdfUrl: invoice.external_pdf_url,
    };

    await handleDownloadPdf({
      userId: user.id,
      invoice: pdfInvoice,
    });
  };
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const formatCnpj = (cnpj: string) => {
    const digits = cnpj.replace(/\D/g, "");
    if (digits.length === 14) {
      return digits.replace(
        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
        "$1.$2.$3/$4-$5"
      );
    }
    return cnpj;
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case "issued":
        return (
          <Badge className="bg-success/10 text-success hover:bg-success/20 border-0">
            Emitida
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-yellow/10 text-yellow-foreground hover:bg-yellow/20 border-0 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processando
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-0">
            Cancelada
          </Badge>
        );
      case "draft":
        return (
          <Badge className="bg-muted text-muted-foreground border-0">
            Rascunho
          </Badge>
        );
    }
  };

  const handleRowClick = (invoice: Invoice) => {
    if (invoice.status === "draft") {
      navigate(`/dashboard/emitir-nota?id=${invoice.id}`);
    } else if (invoice.status === "issued") {
      setSelectedInvoice(invoice);
      setDetailsOpen(true);
    }
  };

  const handleDownloadXml = () => {
    if (!selectedInvoice?.xml_content) {
      toast({
        variant: "destructive",
        title: "XML não disponível",
        description: "Esta nota não possui XML armazenado.",
      });
      return;
    }

    const blob = new Blob([selectedInvoice.xml_content], {
      type: "application/xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NFS-e_${
      selectedInvoice.numero_nota?.replace("/", "-") || selectedInvoice.id
    }.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="w-full max-w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 space-y-6 box-border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full max-w-full">
          <div className="w-full max-w-full">
            <h1 className="text-2xl font-bold text-foreground">
              Histórico de Notas
            </h1>
            <p className="text-muted-foreground">
              Visualize e gerencie suas notas fiscais emitidas
            </p>
          </div>
          <Button asChild className="bg-cta hover:bg-cta/90 shadow-cta w-full sm:w-auto">
            <Link to="/dashboard/emitir-nota">
              <Plus className="mr-2 h-4 w-4" />
              Nova Nota
            </Link>
          </Button>
        </div>

        {/* Filters + Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <div className="space-y-4 w-full max-w-full">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between w-full max-w-full">
              <div className="relative flex-1 w-full sm:max-w-md min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full max-w-full"
                />
              </div>
              <TabsList className="w-full sm:w-auto overflow-x-auto justify-start sm:justify-center">
                <TabsTrigger value="todas">Todas</TabsTrigger>
                <TabsTrigger value="emitidas">Emitidas</TabsTrigger>
                <TabsTrigger value="rascunhos">Rascunhos</TabsTrigger>
              </TabsList>
            </div>

            {/* Advanced filter bar */}
            <div className="grid gap-3 w-full max-w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 items-end box-border">
              <div className="flex flex-col gap-1 w-full max-w-full">
                <span className="text-xs font-medium text-muted-foreground">De</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal h-9 w-full max-w-full",
                        !dateFrom && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "dd/MM/yyyy") : <span>Data inicial</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover border border-border shadow-md z-50" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-1 w-full max-w-full">
                <span className="text-xs font-medium text-muted-foreground">Até</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal h-9 w-full max-w-full",
                        !dateTo && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "dd/MM/yyyy") : <span>Data final</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover border border-border shadow-md z-50" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-1 w-full max-w-full">
                <span className="text-xs font-medium text-muted-foreground">Valor Mínimo (R$)</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={minValue}
                  onChange={(e) => setMinValue(e.target.value)}
                  className="w-full max-w-full"
                />
              </div>

              <div className="flex flex-col gap-1 w-full max-w-full">
                <span className="text-xs font-medium text-muted-foreground">Valor Máximo (R$)</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={maxValue}
                  onChange={(e) => setMaxValue(e.target.value)}
                  className="w-full max-w-full"
                />
              </div>

              <div className="flex flex-col gap-1 md:col-span-1 lg:col-span-1 w-full max-w-full">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 mt-4 md:mt-0 w-full max-w-full"
                  onClick={() => {
                    setSearchQuery("");
                    setDateFrom(undefined);
                    setDateTo(undefined);
                    setMinValue("");
                    setMaxValue("");
                    setActiveTab("todas");
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </div>
        </Tabs>

        {/* KPIs de resumo */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Notas filtradas"
            value={filteredInvoices.length}
            helperText="considerando filtros atuais"
            icon={FileText}
          />
          <KpiCard
            label="Faturamento filtrado"
            value={formatCurrency(
              filteredInvoices.reduce((sum, inv) => sum + Number(inv.valor || 0), 0),
            )}
            helperText="somatório das notas emitidas"
            icon={DollarSign}
            iconColorClass="text-cta bg-cta/15"
          />
          <KpiCard
            label="Notas emitidas"
            value={filteredInvoices.filter((inv) => inv.status === "issued").length}
            helperText="status Emitida"
            icon={TrendingUp}
          />
          <KpiCard
            label="Clientes únicos"
            value={
              new Set(
                filteredInvoices
                  .map((inv) => inv.clients?.razao_social)
                  .filter(Boolean) as string[],
              ).size
            }
            helperText="no conjunto filtrado"
            icon={Users}
            iconColorClass="text-accent-foreground bg-accent/20"
          />
        </div>

        {/* Gráficos de status e faturamento */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Total por Status</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusSummary}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="status" tickLine={false} axisLine={false} className="text-xs" />
                  <YAxis tickLine={false} axisLine={false} className="text-xs" />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Total Faturado por Mês</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlySummary}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs" />
                  <YAxis tickLine={false} axisLine={false} className="text-xs" />
                  <RechartsTooltip
                    formatter={(value: any) =>
                      new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(value as number)
                    }
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Nenhuma nota emitida
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                Comece emitindo sua primeira nota fiscal de serviço.
              </p>
              <Button asChild className="bg-cta hover:bg-cta/90">
                <Link to="/dashboard/emitir-nota">
                  <FileText className="mr-2 h-4 w-4" />
                  Emitir primeira nota
                </Link>
              </Button>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <p className="text-muted-foreground">Nenhuma nota encontrada com os filtros aplicados.</p>
            </div>
          ) : (
            <>
              <TooltipProvider>
                {/* Mobile card list */}
                <div className="block md:hidden">
                  <div className="p-4 space-y-4">
                    {paginatedInvoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="bg-card border border-border rounded-lg shadow-sm p-4 cursor-pointer transition hover:bg-accent/40"
                        onClick={() => handleRowClick(invoice)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {invoice.clients?.razao_social || "Cliente removido"}
                            </p>
                            {invoice.numero_nota && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                Nº {invoice.numero_nota}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0">{getStatusBadge(invoice.status)}</div>
                        </div>

                        <div className="mt-3 space-y-1.5">
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {invoice.descricao_servico || "Sem descrição do serviço"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(invoice.data_emissao)}
                          </p>

                          <div className="flex items-center gap-2 mt-1">
                            {invoice.external_pdf_url && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <FileText className="h-4 w-4 text-destructive" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <span>PDF Oficial Disponível</span>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {invoice.xml_content && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Code2 className="h-4 w-4 text-primary" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <span>XML Oficial Disponível</span>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {invoice.status === "issued" &&
                              !invoice.external_pdf_url &&
                              !invoice.xml_content && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <span>Arquivos oficiais em processamento</span>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-4">
                          <p className="text-lg font-semibold text-primary">
                            {formatCurrency(Number(invoice.valor))}
                          </p>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedInvoice(invoice);
                                setDetailsOpen(true);
                              }}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Detalhes
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-primary hover:bg-primary/5 disabled:text-muted-foreground disabled:hover:bg-transparent transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                generatePDF(invoice);
                              }}
                              disabled={invoice.status !== "issued" && !invoice.external_pdf_url}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              PDF
                            </Button>
                            {invoice.status === "issued" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCancelingInvoice(invoice);
                                  setCancelDialogOpen(true);
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Cancelar
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Desktop table */}
                <div className="hidden md:block">
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden sm:table-cell">Nº da Nota</TableHead>
                          <TableHead>Tomador</TableHead>
                          <TableHead className="hidden sm:table-cell">Data de Emissão</TableHead>
                          <TableHead className="text-center">Arquivos</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedInvoices.map((invoice) => (
                          <TableRow
                            key={invoice.id}
                            className="cursor-pointer"
                            onClick={() => handleRowClick(invoice)}
                          >
                            <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                            <TableCell className="font-medium hidden sm:table-cell">
                              <div className="flex flex-col gap-0.5">
                                <span>{invoice.numero_nota || "-"}</span>
                                {invoice.protocol_number && (
                                  <span className="text-xs text-muted-foreground">
                                    Prot. {invoice.protocol_number}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {invoice.clients?.razao_social || "Cliente removido"}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              {formatDate(invoice.data_emissao)}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                {invoice.external_pdf_url && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <FileText className="h-4 w-4 text-destructive" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <span>PDF Oficial Disponível</span>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {invoice.xml_content && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Code2 className="h-4 w-4 text-primary" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <span>XML Oficial Disponível</span>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {invoice.status === "issued" &&
                                  !invoice.external_pdf_url &&
                                  !invoice.xml_content && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <span>Arquivos oficiais em processamento</span>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(Number(invoice.valor))}
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedInvoice(invoice);
                                  setDetailsOpen(true);
                                }}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Detalhes
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-primary hover:bg-primary/5 disabled:text-muted-foreground disabled:hover:bg-transparent transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  generatePDF(invoice);
                                }}
                                disabled={invoice.status !== "issued" && !invoice.external_pdf_url}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                PDF
                              </Button>
                              {invoice.status === "issued" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCancelingInvoice(invoice);
                                    setCancelDialogOpen(true);
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Cancelar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TooltipProvider>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a{" "}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredInvoices.length)} de{" "}
                    {filteredInvoices.length} notas
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium px-2">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar nota fiscal?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação enviará uma solicitação de cancelamento à prefeitura. A
                nota <strong>{cancelingInvoice?.numero_nota}</strong> será
                marcada como cancelada.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancel}
                className="bg-destructive hover:bg-destructive/90"
              >
                Confirmar Cancelamento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Sheet
          open={detailsOpen}
          onOpenChange={(open) => {
            setDetailsOpen(open);
            if (!open) {
              setSelectedInvoice(null);
              setAuditLogs([]);
            }
          }}
        >
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Detalhes da Nota</SheetTitle>
              <SheetDescription>
                Visualize os detalhes da NFS-e e faça o download dos documentos.
              </SheetDescription>
            </SheetHeader>

            {selectedInvoice && (
              <>
                {isAdmin ? (
                  <Tabs defaultValue="details" className="mt-4">
                    <TabsList className="grid grid-cols-2 w-full">
                      <TabsTrigger value="details">Detalhes</TabsTrigger>
                      <TabsTrigger value="logs">Logs</TabsTrigger>
                    </TabsList>
                    <TabsContent value="details" className="mt-4 space-y-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Número da Nota</span>
                        <span className="font-medium">
                          {selectedInvoice.numero_nota || "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Tomador</span>
                        <span className="font-medium max-w-[180px] text-right truncate">
                          {selectedInvoice.clients?.razao_social || "Cliente removido"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Data de Emissão</span>
                        <span className="font-medium">
                          {formatDate(selectedInvoice.data_emissao)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Valor Bruto</span>
                        <span className="font-semibold">
                          {formatCurrency(Number(selectedInvoice.valor))}
                        </span>
                      </div>

                      {/* Resumo financeiro detalhado */}
                      {(() => {
                        const retention = (selectedInvoice.retention_codes || {}) as any;
                        const desconto = Number(selectedInvoice.discount_unconditional || 0);
                        const issValor = Number(retention.iss?.amount) || 0;
                        const pisValor = Number(retention.pis?.amount) || 0;
                        const cofinsValor = Number(retention.cofins?.amount) || 0;
                        const inssValor = Number(retention.inss?.amount) || 0;
                        const irValor = Number(retention.ir?.amount) || 0;
                        const csllValor = Number(retention.csll?.amount) || 0;

                        const totalRetencoesFederais =
                          pisValor + cofinsValor + inssValor + irValor + csllValor;

                        const valorLiquido = Math.max(
                          Number(selectedInvoice.valor) - desconto - issValor - totalRetencoesFederais,
                          0,
                        );

                        return (
                          <div className="mt-2 space-y-2 rounded-lg border border-border bg-muted/40 p-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Resumo Financeiro
                            </p>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Valor do Serviço</span>
                              <span className="font-medium">
                                {formatCurrency(Number(selectedInvoice.valor))}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Desconto Incond.</span>
                              <span className="font-medium">
                                {formatCurrency(desconto)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Retenções (ISS + Federais)</span>
                              <span className="font-medium">
                                {formatCurrency(issValor + totalRetencoesFederais)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm border-t border-border pt-2 mt-1">
                              <span className="font-semibold text-foreground">Valor Líquido</span>
                              <span className="font-semibold text-primary">
                                {formatCurrency(valorLiquido)}
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <span>{getStatusBadge(selectedInvoice.status)}</span>
                      </div>
                    </TabsContent>
                    <TabsContent value="logs" className="mt-4 space-y-3 text-xs">
                      {logsLoading ? (
                        <div className="flex items-center justify-center py-4 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Carregando logs...
                        </div>
                      ) : auditLogs.length === 0 ? (
                        <p className="text-muted-foreground text-xs">
                          Nenhum evento registrado para esta nota.
                        </p>
                      ) : (
                        <div className="space-y-3 max-h-64 overflow-auto pr-1">
                          {auditLogs.map((log) => (
                            <div
                              key={log.id}
                              className="border border-border rounded-md p-2 bg-muted/40"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-semibold">{log.event_type}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(log.created_at).toLocaleString("pt-BR")}
                                </span>
                              </div>
                              {log.message && (
                                <p className="text-[11px] text-foreground mb-1">{log.message}</p>
                              )}
                              {log.payload && (
                                <pre className="text-[10px] text-muted-foreground bg-background/60 rounded px-1 py-1 overflow-x-auto">
                                  {JSON.stringify(log.payload, null, 2)}
                                </pre>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="mt-4 space-y-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Número da Nota</span>
                      <span className="font-medium">
                        {selectedInvoice.numero_nota || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Tomador</span>
                      <span className="font-medium max-w-[180px] text-right truncate">
                        {selectedInvoice.clients?.razao_social || "Cliente removido"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Data de Emissão</span>
                      <span className="font-medium">
                        {formatDate(selectedInvoice.data_emissao)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Valor Bruto</span>
                      <span className="font-semibold">
                        {formatCurrency(Number(selectedInvoice.valor))}
                      </span>
                    </div>

                    {(() => {
                      const retention = (selectedInvoice.retention_codes || {}) as any;
                      const desconto = Number(selectedInvoice.discount_unconditional || 0);
                      const issValor = Number(retention.iss?.amount) || 0;
                      const pisValor = Number(retention.pis?.amount) || 0;
                      const cofinsValor = Number(retention.cofins?.amount) || 0;
                      const inssValor = Number(retention.inss?.amount) || 0;
                      const irValor = Number(retention.ir?.amount) || 0;
                      const csllValor = Number(retention.csll?.amount) || 0;

                      const totalRetencoesFederais =
                        pisValor + cofinsValor + inssValor + irValor + csllValor;

                      const valorLiquido = Math.max(
                        Number(selectedInvoice.valor) - desconto - issValor - totalRetencoesFederais,
                        0,
                      );

                      return (
                        <div className="mt-2 space-y-2 rounded-lg border border-border bg-muted/40 p-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Resumo Financeiro
                          </p>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Valor do Serviço</span>
                            <span className="font-medium">
                              {formatCurrency(Number(selectedInvoice.valor))}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Desconto Incond.</span>
                            <span className="font-medium">
                              {formatCurrency(desconto)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Retenções (ISS + Federais)</span>
                            <span className="font-medium">
                              {formatCurrency(issValor + totalRetencoesFederais)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm border-t border-border pt-2 mt-1">
                            <span className="font-semibold text-foreground">Valor Líquido</span>
                            <span className="font-semibold text-primary">
                              {formatCurrency(valorLiquido)}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span>{getStatusBadge(selectedInvoice.status)}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            <SheetFooter className="mt-6 flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center"
                onClick={() => {
                  if (selectedInvoice) {
                    generatePDF(selectedInvoice);
                  }
                }}
                disabled={!selectedInvoice || (selectedInvoice.status !== "issued" && !selectedInvoice.external_pdf_url)}
              >
                <Download className="mr-2 h-4 w-4" />
                Baixar PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center"
                onClick={handleDownloadXml}
                disabled={!selectedInvoice}
              >
                <Download className="mr-2 h-4 w-4" />
                Baixar XML
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
}
