import { useEffect, useMemo, useState } from "react";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarIcon,
  BarChart3,
  PieChart,
  FileText,
  Users,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Pie,
  PieChart as RechartsPieChart,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { KpiCard } from "@/components/dashboard/KpiCard";

interface InvoiceWithClient {
  valor: number;
  data_emissao: string;
  status: string;
  clients: {
    razao_social: string;
  } | null;
}

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--cta))",
  "hsl(var(--success))",
];

export default function Relatorios() {
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [invoices, setInvoices] = useState<InvoiceWithClient[]>([]);
  const [loading, setLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState<
    "all" | "issued" | "draft" | "processing" | "cancelled"
  >("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const dateRangeLabel = useMemo(() => {
    if (!dateFrom && !dateTo) return "Últimos 6 meses";
    if (dateFrom && !dateTo) return `A partir de ${format(dateFrom, "dd/MM/yy")}`;
    if (!dateFrom && dateTo) return `Até ${format(dateTo, "dd/MM/yy")}`;
    return `${format(dateFrom!, "dd/MM/yy")} - ${format(dateTo!, "dd/MM/yy")}`;
  }, [dateFrom, dateTo]);

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);

      const now = new Date();
      const effectiveFrom = dateFrom ?? subMonths(now, 6);
      const effectiveTo = dateTo ?? now;

      const { data, error } = await supabase
        .from("invoices")
        .select(
          `valor, data_emissao, status, clients ( razao_social )`,
        )
        .gte("data_emissao", effectiveFrom.toISOString())
        .lte("data_emissao", effectiveTo.toISOString())
        .order("data_emissao", { ascending: true });

      if (!error && data) {
        setInvoices(
          data.map((inv: any) => ({
            valor: Number(inv.valor) || 0,
            data_emissao: inv.data_emissao,
            status: inv.status,
            clients: inv.clients,
          })),
        );
      } else {
        setInvoices([]);
      }

      setLoading(false);
    };

    fetchInvoices();
  }, [dateFrom, dateTo]);

  const clientOptions = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((inv) => {
      if (inv.clients?.razao_social) {
        set.add(inv.clients.razao_social);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [invoices]);

  const parseCurrencyFilter = (value: string) => {
    if (!value.trim()) return NaN;
    return Number(value.replace(/\./g, "").replace(",", "."));
  };

  const filteredInvoices = useMemo(() => {
    let result = invoices;

    if (statusFilter && statusFilter !== "all") {
      result = result.filter((inv) => inv.status === statusFilter);
    }

    if (clientFilter !== "all") {
      result = result.filter((inv) => inv.clients?.razao_social === clientFilter);
    }

    const min = parseCurrencyFilter(minValue);
    const max = parseCurrencyFilter(maxValue);

    if (!Number.isNaN(min)) {
      result = result.filter((inv) => inv.valor >= min);
    }

    if (!Number.isNaN(max)) {
      result = result.filter((inv) => inv.valor <= max);
    }

    return result;
  }, [invoices, statusFilter, clientFilter, minValue, maxValue]);

  const summary = useMemo(() => {
    if (!filteredInvoices.length) {
      return {
        totalRevenue: 0,
        avgTicket: 0,
        invoicesCount: 0,
        clientsCount: 0,
      };
    }

    const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + inv.valor, 0);
    const invoicesCount = filteredInvoices.length;
    const avgTicket = invoicesCount ? totalRevenue / invoicesCount : 0;
    const uniqueClients = new Set(
      filteredInvoices
        .map((inv) => inv.clients?.razao_social)
        .filter(Boolean) as string[],
    );

    return {
      totalRevenue,
      avgTicket,
      invoicesCount,
      clientsCount: uniqueClients.size,
    };
  }, [filteredInvoices]);

  const monthlyRevenue = useMemo(() => {
    const map = new Map<string, number>();

    filteredInvoices.forEach((inv) => {
      const date = new Date(inv.data_emissao);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      map.set(key, (map.get(key) || 0) + inv.valor);
    });

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => {
        const [yearStr, monthStr] = key.split("-");
        const date = new Date(Number(yearStr), Number(monthStr), 1);
        return {
          key,
          month: date.toLocaleDateString("pt-BR", {
            month: "short",
          }),
          value,
        };
      });
  }, [filteredInvoices]);

  const revenueByClient = useMemo(() => {
    const map = new Map<string, number>();

    filteredInvoices.forEach((inv) => {
      const name = inv.clients?.razao_social || "Sem cadastro";
      map.set(name, (map.get(name) || 0) + inv.valor);
    });

    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
  }, [filteredInvoices]);

  const taxesByMonth = useMemo(() => {
    const taxRate = 0.06; // estimativa simples para visualização
    return monthlyRevenue.map((item) => ({
      month: item.month,
      estimatedTax: item.value * taxRate,
    }));
  }, [monthlyRevenue]);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Relatórios avançados
            </h1>
            <p className="text-muted-foreground text-base max-w-xl">
              Visualize o desempenho do seu negócio com gráficos e métricas consolidadas.
            </p>
          </div>

          {/* Filtro de período */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full sm:w-[260px] justify-start text-left font-normal rounded-full",
                    !dateFrom && !dateTo && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span>{dateRangeLabel}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="flex flex-col gap-3 p-3">
                  <Calendar
                    mode="range"
                    selected={{ from: dateFrom, to: dateTo }}
                    onSelect={(range) => {
                      setDateFrom(range?.from);
                      setDateTo(range?.to);
                    }}
                    initialFocus
                    locale={ptBR}
                    className={cn("p-3 pointer-events-auto")}
                  />
                  <div className="flex justify-between gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full"
                      onClick={() => {
                        setDateFrom(undefined);
                        setDateTo(undefined);
                      }}
                    >
                      Limpar
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Filtros adicionais */}
        <Card>
          <CardContent className="pt-4 grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Status da nota</p>
              <Select
                value={statusFilter || "all"}
                onValueChange={(value) =>
                  setStatusFilter(value === "all" ? "all" : (value as any))
                }
              >
                <SelectTrigger className="h-10 rounded-full text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="issued">Emitidas</SelectItem>
                  <SelectItem value="draft">Rascunhos</SelectItem>
                  <SelectItem value="processing">Processando</SelectItem>
                  <SelectItem value="cancelled">Canceladas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Cliente</p>
              <Select
                value={clientFilter}
                onValueChange={(value) => setClientFilter(value)}
              >
                <SelectTrigger className="h-10 rounded-full text-sm">
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {clientOptions.map((client) => (
                    <SelectItem key={client} value={client}>
                      {client}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Valor mínimo (R$)</p>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 1.000,00"
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
                className="h-10 rounded-full text-sm"
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Valor máximo (R$)</p>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 10.000,00"
                value={maxValue}
                onChange={(e) => setMaxValue(e.target.value)}
                className="h-10 rounded-full text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Resumo de métricas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Faturamento total"
            value={formatCurrency(summary.totalRevenue)}
            helperText="considerando o período e filtros"
            icon={BarChart3}
          />
          <KpiCard
            label="Ticket médio"
            value={formatCurrency(summary.avgTicket)}
            helperText="por nota fiscal emitida"
            icon={PieChart}
            iconColorClass="text-cta bg-cta/10"
          />
          <KpiCard
            label="Notas emitidas"
            value={summary.invoicesCount}
            helperText="no período e filtros atuais"
            icon={FileText}
          />
          <KpiCard
            label="Clientes ativos"
            value={summary.clientsCount}
            helperText="emitindo notas nesse período"
            icon={Users}
            iconColorClass="text-accent-foreground bg-accent/20"
          />
        </div>

        {/* Gráficos principais */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Faturamento por mês */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Faturamento por mês
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`}
                    />
                    <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value))} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Faturamento por cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                Faturamento por cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 flex flex-col gap-4">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={revenueByClient}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                    >
                      {revenueByClient.map((entry, index) => (
                        <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {revenueByClient.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                      />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-medium text-foreground">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Novos gráficos: comparativo e evolução de impostos */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Comparativo mês a mês
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`}
                    />
                    <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value))} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Evolução estimada de impostos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={taxesByMonth}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`}
                    />
                    <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value))} />
                    <Line
                      type="monotone"
                      dataKey="estimatedTax"
                      stroke="hsl(var(--success))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                * Cálculo ilustrativo com alíquota média estimada de 6% sobre o faturamento mensal.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
