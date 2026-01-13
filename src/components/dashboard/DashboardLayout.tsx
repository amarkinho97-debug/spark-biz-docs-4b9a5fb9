import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Headset } from "lucide-react";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

interface DashboardLayoutProps {
  children: ReactNode;
}

function useDashboardBreadcrumb() {
  const location = useLocation();
  const path = location.pathname || "";

  if (path.startsWith("/dashboard/notas")) {
    return "Início > Notas Fiscais";
  }

  if (path.startsWith("/dashboard/relatorios")) {
    return "Início > Relatórios";
  }

  if (path.startsWith("/dashboard/clientes")) {
    return "Início > Clientes";
  }

  if (path.startsWith("/dashboard/configuracoes")) {
    return "Início > Configurações";
  }

  return "Início";
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const breadcrumb = useDashboardBreadcrumb();
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companyLoading, setCompanyLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const loadCompanyName = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("nome_fantasia, logo_url")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Erro ao carregar nome da empresa no header", error);
        setCompanyLoading(false);
        return;
      }

      if (data && "nome_fantasia" in data) {
        const profile = data as { nome_fantasia: string | null; logo_url: string | null };
        setCompanyName(profile.nome_fantasia);
        setCompanyLogo(profile.logo_url);
      }

      setCompanyLoading(false);
    };

    loadCompanyName();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ice">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const initial = user.email?.[0]?.toUpperCase() || "U";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full max-w-[100vw] overflow-x-hidden box-border">
        <AppSidebar />
        <SidebarInset className="flex-1 relative">
          <header className="h-16 border-b border-border/40 flex items-center justify-between px-4 bg-background sticky top-0 z-10">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger className="-ml-1" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
                  Navegação
                </span>
                <span className="text-sm font-medium text-foreground truncate">
                  {breadcrumb}
                </span>
              </div>
            </div>
 
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/60 bg-card shadow-sm">
                {companyLogo ? (
                  <img
                    src={companyLogo}
                    alt={companyName || "Logo da empresa"}
                    className="h-9 w-9 rounded-full object-contain bg-background border border-border/60"
                  />
                ) : (
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs font-medium">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="flex flex-col leading-tight">
                  <span className="text-xs font-medium text-foreground">
                    {companyLoading
                      ? "Minha Empresa"
                      : companyName || "Configurar"}
                  </span>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      Plano Pro
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 bg-ice overflow-x-hidden w-full max-w-[100vw] box-border">{children}</main>
 
          {/* Floating Support Widget */}
          <div className="fixed bottom-4 right-4 z-20">
            <SupportWidget />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
 
function SupportWidget() {
  const whatsappUrl =
    "https://wa.me/5543991521870?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20os%20planos%20da%20Qontax%20para%20minha%20empresa.";
  const emailUrl = "mailto:contato@seuescritorio.com";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className="rounded-full shadow-lg shadow-primary/30 h-12 w-12 flex items-center justify-center"
          size="icon"
        >
          <Headset className="h-6 w-6" />
          <span className="sr-only">Abrir suporte humano</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 mr-2 mb-2 bg-popover border border-border shadow-md z-50">
        <div className="flex items-start gap-3">
          <Avatar>
            <AvatarFallback>AC</AvatarFallback>
          </Avatar>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium leading-none">Seu contador</p>
              <p className="text-sm text-muted-foreground mt-1">
                Olá! Dúvidas sobre sua nota ou imposto?
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button asChild className="w-full transition-transform hover:scale-[1.02] active:scale-[0.97]" variant="default">
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  Iniciar conversa no WhatsApp
                </a>
              </Button>
              <Button asChild className="w-full" variant="outline">
                <a href={emailUrl}>
                  Abrir Chamado/E-mail
                </a>
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
