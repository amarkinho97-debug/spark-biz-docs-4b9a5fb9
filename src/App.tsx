import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import CookieConsent from "@/components/CookieConsent";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import EmitirNota from "./pages/EmitirNota";
import Notas from "./pages/Notas";
import Clientes from "./pages/Clientes";
import Configuracoes from "./pages/Configuracoes";
import Documentos from "./pages/Documentos";
import Relatorios from "./pages/Relatorios";
import Recorrencia from "./pages/Recorrencia";
import NotFound from "./pages/NotFound";
import TermsOfUse from "./pages/TermsOfUse";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import PendingApproval from "./pages/PendingApproval";
import Admin from "./pages/Admin";
import AccessDenied from "./pages/AccessDenied";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <Toaster />
      <Sonner />
      <div className="w-full max-w-[100vw] overflow-x-hidden box-border">
        <BrowserRouter>
          <CookieConsent />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/pending-approval" element={<PendingApproval />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/access-denied" element={<AccessDenied />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/emitir-nota" element={<EmitirNota />} />
            <Route path="/dashboard/recorrencia" element={<Recorrencia />} />
            <Route path="/dashboard/notas" element={<Notas />} />
            <Route path="/dashboard/clientes" element={<Clientes />} />
            <Route path="/dashboard/documentos" element={<Documentos />} />
            <Route path="/dashboard/configuracoes" element={<Configuracoes />} />
            <Route path="/dashboard/relatorios" element={<Relatorios />} />
            <Route path="/termos" element={<TermsOfUse />} />
            <Route path="/privacidade" element={<PrivacyPolicy />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  </QueryClientProvider>
);
 
export default App;
