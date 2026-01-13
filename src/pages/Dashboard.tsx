import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Users, DollarSign, TrendingUp, ShieldCheck, Globe2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { AutomationActivityCard } from "@/components/dashboard/AutomationActivityCard";

interface Stats {
  totalInvoices: number;
  totalClients: number;
  totalValue: number;
  monthlyInvoices: number;
}

interface MonthlyRevenuePoint {
  month: string;
  total: number;
}

export default function Dashboard() {
  const { user } = useAuth();

  const defaultStats: Stats = {
    totalInvoices: 0,
    totalClients: 0,
    totalValue: 0,
    monthlyInvoices: 0,
  };

  const {
    data: dashboardData,
    isLoading: statsLoading,
  } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user) {
        return { stats: defaultStats, chartData: [] as MonthlyRevenuePoint[] };
      }

      const [invoicesRes, clientsRes] = await Promise.all([
        supabase.from("invoices").select("valor, data_emissao").eq("user_id", user.id),
        supabase.from("clients").select("id").eq("user_id", user.id),
      ]);

      const invoices = invoicesRes.data || [];
      const clients = clientsRes.data || [];

      const totalValue = invoices.reduce(
        (sum, inv: any) => sum + Number(inv.valor),
        0
      );

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyInvoices = invoices.filter((inv: any) => {
        const date = new Date(inv.data_emissao);
        return (
          date.getMonth() === currentMonth &&
          date.getFullYear() === currentYear
        );
      }).length;

      let revenueData: MonthlyRevenuePoint[] = [];

      if (invoices.length > 0) {
        const monthlyMap = new Map<string, number>();

        invoices.forEach((inv: any) => {
          const date = new Date(inv.data_emissao);
          const key = `${date.getFullYear()}-${date.getMonth()}`;
          const currentTotal = monthlyMap.get(key) || 0;
          monthlyMap.set(key, currentTotal + Number(inv.valor));
        });

        const lastSixMonths: { key: string; label: string }[] = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date(currentYear, currentMonth - i, 1);
          const key = `${date.getFullYear()}-${date.getMonth()}`;
          const label = date.toLocaleDateString("pt-BR", {
            month: "short",
            year: "2-digit",
          });
          lastSixMonths.push({ key, label });
        }

        revenueData = lastSixMonths.map(({ key, label }) => {
          const total = monthlyMap.get(key) || 0;
          return {
            month: label,
            total,
          };
        });
      }

      return {
        stats: {
          totalInvoices: invoices.length,
          totalClients: clients.length,
          totalValue,
          monthlyInvoices,
        },
        chartData: revenueData,
      };
    },
  });

  const stats = dashboardData?.stats ?? defaultStats;
  const chartData = dashboardData?.chartData ?? [];

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState<Stats>({
    totalInvoices: 0,
    totalClients: 0,
    totalValue: 0,
    monthlyInvoices: 0,
  });

  useEffect(() => {
    async function fetchAdminData() {
      if (!user) {
        setIsAdmin(false);
        setAdminLoading(false);
        return;
      }

      try {
        const { data: hasRole, error: roleError } = await supabase.rpc(
          "has_role",
          {
            _user_id: user.id,
            _role: "admin",
          }
        );

        if (roleError || !hasRole) {
          setIsAdmin(false);
          setAdminLoading(false);
          return;
        }

        setIsAdmin(true);

        // Admin users can see their own invoices + clients (not global anymore)
        const [allInvoicesRes, allClientsRes] = await Promise.all([
          supabase.from("invoices").select("valor, data_emissao").eq("user_id", user.id),
          supabase.from("clients").select("id").eq("user_id", user.id),
        ]);

        const invoices = allInvoicesRes.data || [];
        const clients = allClientsRes.data || [];

        const totalValue = invoices.reduce(
          (sum, inv: any) => sum + Number(inv.valor),
          0
        );

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyInvoices = invoices.filter((inv: any) => {
          const date = new Date(inv.data_emissao);
          return (
            date.getMonth() === currentMonth &&
            date.getFullYear() === currentYear
          );
        }).length;

        setGlobalStats({
          totalInvoices: invoices.length,
          totalClients: clients.length,
          totalValue,
          monthlyInvoices,
        });
      } finally {
        setAdminLoading(false);
      }
    }

    fetchAdminData();
  }, [user]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

    return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Visão geral
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Acompanhe suas notas fiscais e clientes.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="bg-card border border-border rounded-xl shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <KpiCard
                label="Total de Notas"
                value={stats.totalInvoices}
                helperText="notas emitidas"
                icon={FileText}
              />
              <KpiCard
                label="Notas este mês"
                value={stats.monthlyInvoices}
                helperText={new Date().toLocaleString("pt-BR", { month: "long" })}
                icon={TrendingUp}
              />
              <KpiCard
                label="Total faturado"
                value={formatCurrency(stats.totalValue)}
                helperText="valor total"
                icon={DollarSign}
                iconColorClass="text-cta bg-cta/15"
              />
              <KpiCard
                label="Clientes"
                value={stats.totalClients}
                helperText="cadastrados"
                icon={Users}
                iconColorClass="text-accent-foreground bg-accent/20"
              />
            </>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Evolução de Faturamento</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/40">
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  Aguardando primeiras notas fiscais para gerar gráfico.
                </p>
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ left: 0, right: 0 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="2 2"
                      stroke="hsl(var(--border) / 0.6)"
                    />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) =>
                        formatCurrency(Number(value)).replace("R$", "")
                      }
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="hsl(var(--primary))"
                      fill="url(#revenueGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <AutomationActivityCard />

        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4 flex-wrap">
            <Button asChild className="bg-cta hover:bg-cta/90 shadow-cta rounded-full">
              <Link to="/dashboard/emitir-nota">
                <FileText className="mr-2 h-4 w-4" />
                Emitir Nova Nota
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/dashboard/clientes">
                <Users className="mr-2 h-4 w-4" />
                Gerenciar Clientes
              </Link>
            </Button>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Painel Global (Admin)</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Métricas agregadas de toda a base, visíveis apenas para administradores.
                  </p>
                </div>
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {adminLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Card
                      key={index}
                      className="bg-card border border-border rounded-xl shadow-sm"
                    >
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-8 w-20 mb-2" />
                        <Skeleton className="h-3 w-24" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <KpiCard
                    label="Notas (Global)"
                    value={globalStats.totalInvoices}
                    helperText="todas as notas da base"
                    icon={FileText}
                  />
                  <KpiCard
                    label="Faturamento (Global)"
                    value={formatCurrency(globalStats.totalValue)}
                    helperText="soma de todas as notas"
                    icon={DollarSign}
                    iconColorClass="text-cta bg-cta/10"
                  />
                  <KpiCard
                    label="Clientes (Global)"
                    value={globalStats.totalClients}
                    helperText="clientes cadastrados na base"
                    icon={Users}
                    iconColorClass="text-accent-foreground bg-accent/20"
                  />
                  <KpiCard
                    label="Notas (Mês atual)"
                    value={globalStats.monthlyInvoices}
                    helperText={new Date().toLocaleString("pt-BR", { month: "long" })}
                    icon={TrendingUp}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
