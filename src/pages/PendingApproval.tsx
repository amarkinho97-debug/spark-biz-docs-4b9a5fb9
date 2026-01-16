import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Loader2, ShieldCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useApprovalProfile } from "@/hooks/useProfileStatus";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function PendingApproval() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading, signOut } = useAuth();
  const { data: approvalProfile, isLoading: statusLoading, refetch } = useApprovalProfile();

  const status = approvalProfile?.status ?? "pending";
  const rejectionReason = approvalProfile?.rejection_reason ?? null;

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true });
      return;
    }

    if (!loading && user && !statusLoading && status === "active") {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, user, statusLoading, status, navigate]);

  const whatsappUrl =
    "https://wa.me/5543991521870?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20com%20o%20status%20da%20minha%20conta.";

  const onResubmit = async () => {
    if (!user?.id || !user.email) return;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ status: "pending", rejection_reason: null })
      .eq("id", user.id);

    if (updateError) {
      toast({
        variant: "destructive",
        title: "Erro ao solicitar nova análise",
        description: updateError.message,
      });
      return;
    }

    const { error: logError } = await supabase.from("admin_audit_logs").insert({
      admin_id: user.id,
      admin_email: user.email,
      target_user_id: user.id,
      target_email: user.email,
      action: "resubmitted",
      details: null,
    });

    // Se o log falhar, não bloqueia o usuário (a resubmissão já foi feita)
    if (logError) {
      console.error("Falha ao registrar log de resubmissão", logError);
    }

    await refetch();

    toast({
      title: "Solicitação reenviada",
      description: "Sua conta voltou para análise. Aguarde a aprovação.",
    });
  };

  if (loading || (user && statusLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ice">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isRejected = status === "rejected";

  return (
    <main className="min-h-screen bg-ice flex items-center justify-center px-4 py-12">
      <section className="w-full max-w-xl">
        <div
          className={
            "bg-card/90 backdrop-blur-sm rounded-3xl shadow-lg border border-border/60 p-8 md:p-10" +
            (isRejected ? " border-destructive/30" : "")
          }
        >
          <div className="flex flex-col items-center gap-4 mb-6">
            <div
              className={
                "w-12 h-12 rounded-2xl flex items-center justify-center " +
                (isRejected ? "bg-destructive/10" : "bg-primary/10")
              }
            >
              {isRejected ? (
                <AlertTriangle className="w-6 h-6 text-destructive" />
              ) : (
                <ShieldCheck className="w-6 h-6 text-primary" />
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-center">
              {isRejected ? "Cadastro não aprovado" : "Cadastro em Análise"}
            </h1>

            {isRejected ? (
              <div className="w-full rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                <p className="text-sm font-medium text-foreground mb-1">Motivo informado</p>
                <p className="text-sm text-muted-foreground">
                  {rejectionReason?.trim()
                    ? rejectionReason
                    : "Sua solicitação não foi aprovada. Entre em contato com o suporte para orientações."}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-center text-sm md:text-base">
                Recebemos sua solicitação. Nossa equipe de segurança está validando
                seus dados para liberar o acesso ao sistema fiscal. Você será
                notificado em breve.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {isRejected && (
              <Button type="button" className="w-full gap-2" onClick={onResubmit}>
                <RotateCcw className="h-4 w-4" />
                Solicitar Nova Análise
              </Button>
            )}

            <Button asChild variant="default" className="w-full">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                Falar com Suporte
              </a>
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={async () => {
                await signOut();
                navigate("/", { replace: true });
              }}
            >
              Sair
            </Button>
          </div>

          <p className="mt-6 text-xs text-muted-foreground text-center">
            Status atual: <span className="font-medium">{status}</span>
          </p>
        </div>
      </section>
    </main>
  );
}
