import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfileStatus } from "@/hooks/useProfileStatus";

export default function PendingApproval() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { data: status, isLoading: statusLoading } = useProfileStatus();

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
    "https://wa.me/5543991521870?text=Ol%C3%A1!%20Minha%20conta%20est%C3%A1%20em%20an%C3%A1lise.%20Podem%20me%20ajudar%3F";

  if (loading || (user && statusLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ice">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-ice flex items-center justify-center px-4 py-12">
      <section className="w-full max-w-xl">
        <div className="bg-card/90 backdrop-blur-sm rounded-3xl shadow-lg border border-border/60 p-8 md:p-10">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-center">
              Cadastro em Análise
            </h1>
            <p className="text-muted-foreground text-center text-sm md:text-base">
              Recebemos sua solicitação. Nossa equipe de segurança está validando
              seus dados para liberar o acesso ao sistema fiscal. Você será
              notificado em breve.
            </p>
          </div>

          <div className="flex flex-col gap-3">
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
            Status atual: <span className="font-medium">{status ?? "pending"}</span>
          </p>
        </div>
      </section>
    </main>
  );
}
