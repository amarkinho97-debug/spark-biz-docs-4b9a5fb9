import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccessDenied() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-ice flex items-center justify-center px-4 py-12">
      <section className="w-full max-w-xl">
        <div className="bg-card/90 backdrop-blur-sm rounded-3xl shadow-lg border border-border/60 p-8 md:p-10">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-destructive" />
            </div>

            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-center">
              Você não tem permissão para acessar esta área
            </h1>

            <p className="text-muted-foreground text-center text-sm md:text-base">
              Se você acredita que isso é um engano, entre em contato com o suporte.
            </p>

            <div className="w-full mt-2">
              <Button className="w-full" onClick={() => navigate("/dashboard", { replace: true })}>
                Voltar ao Dashboard
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
