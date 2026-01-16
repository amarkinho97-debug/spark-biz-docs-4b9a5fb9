import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";

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
import { useToast } from "@/hooks/use-toast";

type PendingUserRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
};

export default function Admin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, loading } = useAuth();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingUser, setRejectingUser] = useState<PendingUserRow | null>(null);

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
      navigate("/dashboard", { replace: true });
    }
  }, [loading, user, isAdminLoading, isAdmin, navigate]);

  const { data: pendingUsers, isLoading: pendingLoading } = useQuery({
    queryKey: ["admin", "pending-users"],
    enabled: !!user?.id && !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as PendingUserRow[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (target: PendingUserRow) => {
      if (!user?.id) throw new Error("Sessão inválida.");

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ status: "active", rejection_reason: null })
        .eq("id", target.id);

      if (updateError) throw updateError;

      const { error: logError } = await supabase.from("approval_audit_logs").insert({
        admin_id: user.id,
        target_user_id: target.id,
        action_type: "approve",
      });

      if (logError) throw logError;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "pending-users"] });
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
    mutationFn: async ({ target, reason }: { target: PendingUserRow; reason: string }) => {
      if (!user?.id) throw new Error("Sessão inválida.");

      const cleanReason = reason.trim();
      if (!cleanReason) throw new Error("Informe um motivo da rejeição.");

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ status: "rejected", rejection_reason: cleanReason })
        .eq("id", target.id);

      if (updateError) throw updateError;

      const { error: logError } = await supabase.from("approval_audit_logs").insert({
        admin_id: user.id,
        target_user_id: target.id,
        action_type: "reject",
      });

      if (logError) throw logError;
    },
    onSuccess: async () => {
      setRejectOpen(false);
      setRejectReason("");
      setRejectingUser(null);
      await queryClient.invalidateQueries({ queryKey: ["admin", "pending-users"] });
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

  const contentLoading = loading || isAdminLoading || (!!user && !!isAdmin && pendingLoading);

  const rows = pendingUsers ?? [];

  const formatDate = useMemo(
    () => (value: string) => new Date(value).toLocaleString("pt-BR"),
    [],
  );

  if (contentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ice">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-ice px-4 py-8">
      <section className="mx-auto w-full max-w-5xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Painel do Administrador
                </CardTitle>
                <CardDescription>
                  Aprovação manual de usuários pendentes.
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => navigate("/dashboard")}>Voltar</Button>
            </div>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhum usuário pendente no momento.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border/60 bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Data de Cadastro</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => {
                      const name = [row.first_name, row.last_name].filter(Boolean).join(" ") || "-";
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{name}</TableCell>
                          <TableCell className="text-muted-foreground">{row.email ?? "-"}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(row.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="default"
                                className="gap-2"
                                disabled={approveMutation.isPending || rejectMutation.isPending}
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
                                  setRejectReason("");
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
