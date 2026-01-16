import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Search, ShieldCheck, XCircle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

type ProfileStatus = "pending" | "active" | "rejected";

type UserRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  status: ProfileStatus;
  created_at: string;
  rejection_reason: string | null;
};

type AuditRow = {
  id: string;
  admin_email: string;
  target_email: string | null;
  action: "approved" | "rejected" | "resubmitted";
  details: string | null;
  created_at: string;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}

export default function Admin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, loading } = useAuth();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingUser, setRejectingUser] = useState<UserRow | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProfileStatus>("pending");

  const { data: isAdmin, isLoading: isAdminLoading } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (error) throw error;
      return Boolean(data);
    },
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true });
      return;
    }

    if (!loading && user && !isAdminLoading && !isAdmin) {
      navigate("/access-denied", { replace: true });
    }
  }, [loading, user, isAdminLoading, isAdmin, navigate]);

  const queryParamsKey = useMemo(
    () => ({ q: search.trim().toLowerCase(), status: statusFilter }),
    [search, statusFilter],
  );

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["admin", "profiles", queryParamsKey],
    enabled: !!user?.id && !!isAdmin,
    queryFn: async () => {
      let q = supabase
        .from("profiles")
        .select("id, email, first_name, last_name, status, created_at, rejection_reason")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        q = q.eq("status", statusFilter);
      }

      const needle = search.trim();
      if (needle.length >= 2) {
        const escaped = needle.split(",").join(" ");
        q = q.or(
          `email.ilike.%${escaped}%,first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%`,
        );
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as UserRow[];
    },
  });

  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ["admin", "audit-logs"],
    enabled: !!user?.id && !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_logs")
        .select("id, admin_email, target_email, action, details, created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (target: UserRow) => {
      if (!user?.id || !user.email) throw new Error("Sessão inválida.");

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ status: "active", rejection_reason: null })
        .eq("id", target.id);

      if (updateError) throw updateError;

      const { error: logError } = await supabase.from("admin_audit_logs").insert({
        admin_id: user.id,
        admin_email: user.email,
        target_user_id: target.id,
        target_email: target.email,
        action: "approved",
        details: null,
      });

      if (logError) throw logError;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "profiles"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] }),
      ]);
      toast({ title: "Usuário aprovado", description: "A conta foi liberada com sucesso." });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao aprovar",
        description: err?.message ?? "Não foi possível aprovar o usuário.",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ target, reason }: { target: UserRow; reason: string }) => {
      if (!user?.id || !user.email) throw new Error("Sessão inválida.");

      const cleanReason = reason.trim();
      if (!cleanReason) throw new Error("Informe um motivo da rejeição.");

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ status: "rejected", rejection_reason: cleanReason })
        .eq("id", target.id);

      if (updateError) throw updateError;

      const { error: logError } = await supabase.from("admin_audit_logs").insert({
        admin_id: user.id,
        admin_email: user.email,
        target_user_id: target.id,
        target_email: target.email,
        action: "rejected",
        details: cleanReason,
      });

      if (logError) throw logError;
    },
    onSuccess: async () => {
      setRejectOpen(false);
      setRejectReason("");
      setRejectingUser(null);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "profiles"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] }),
      ]);

      toast({ title: "Usuário rejeitado", description: "O motivo foi salvo e a conta foi bloqueada." });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao rejeitar",
        description: err?.message ?? "Não foi possível rejeitar o usuário.",
      });
    },
  });

  const contentLoading = loading || isAdminLoading || (!!user && !!isAdmin && (usersLoading || auditLoading));

  if (contentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ice">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const rows = users ?? [];
  const auditRows = auditLogs ?? [];

  return (
    <main className="min-h-screen bg-ice px-4 py-8">
      <section className="mx-auto w-full max-w-6xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Painel Admin
                </CardTitle>
                <CardDescription>Gestão de acessos e auditoria.</CardDescription>
              </div>
              <Button variant="outline" onClick={() => navigate("/dashboard")}>Voltar ao Dashboard</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="requests" className="w-full">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="requests">Solicitações Pendentes</TabsTrigger>
                <TabsTrigger value="audit">Histórico de Auditoria</TabsTrigger>
              </TabsList>

              <TabsContent value="requests" className="mt-6 space-y-4">
                <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                  <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar por nome ou e-mail"
                      className="pl-9"
                    />
                  </div>

                  <div className="w-full md:w-64">
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filtrar status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {rows.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/60 bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data Cadastro</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => {
                          const name = [row.first_name, row.last_name].filter(Boolean).join(" ") || "-";
                          const canAct = row.status !== "active";
                          return (
                            <TableRow key={row.id}>
                              <TableCell className="font-medium">{name}</TableCell>
                              <TableCell className="text-muted-foreground">{row.email ?? "-"}</TableCell>
                              <TableCell className="text-muted-foreground">{row.status}</TableCell>
                              <TableCell className="text-muted-foreground">{formatDateTime(row.created_at)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="default"
                                    className="gap-2"
                                    disabled={!canAct || approveMutation.isPending || rejectMutation.isPending}
                                    onClick={() => approveMutation.mutate(row)}
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Aprovar
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    className="gap-2"
                                    disabled={approveMutation.isPending || rejectMutation.isPending}
                                    onClick={() => {
                                      setRejectingUser(row);
                                      setRejectReason(row.rejection_reason ?? "");
                                      setRejectOpen(true);
                                    }}
                                  >
                                    <XCircle className="h-4 w-4" />
                                    Rejeitar
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="audit" className="mt-6">
                {auditRows.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm text-muted-foreground">Nenhum log registrado ainda.</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/60 bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Quando</TableHead>
                          <TableHead>Ação</TableHead>
                          <TableHead>Admin</TableHead>
                          <TableHead>Alvo</TableHead>
                          <TableHead>Detalhes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditRows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="text-muted-foreground">{formatDateTime(row.created_at)}</TableCell>
                            <TableCell className="font-medium">{row.action}</TableCell>
                            <TableCell className="text-muted-foreground">{row.admin_email}</TableCell>
                            <TableCell className="text-muted-foreground">{row.target_email ?? "-"}</TableCell>
                            <TableCell className="text-muted-foreground">{row.details ?? "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo da rejeição</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="rejection_reason">Explique brevemente o motivo</Label>
            <Input
              id="rejection_reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex: Dados inconsistentes / documento inválido"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectOpen(false);
                setRejectReason("");
                setRejectingUser(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectingUser || rejectMutation.isPending}
              onClick={() => {
                if (!rejectingUser) return;
                rejectMutation.mutate({ target: rejectingUser, reason: rejectReason });
              }}
            >
              Confirmar rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
