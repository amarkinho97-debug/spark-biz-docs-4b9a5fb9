import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ice">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ice flex flex-col">
      <div className="p-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao site
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-xl">
          <div className="bg-card/90 backdrop-blur-sm rounded-3xl shadow-lg border border-border/60 p-8 md:p-10">
            <div className="flex flex-col items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div className="text-center">
                <h1 className="text-sm font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                  QONTAX VISOR
                </h1>
              </div>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center mb-2">
              {isLogin ? "Entrar na sua conta" : "Crie sua conta"}
            </h2>
            <p className="text-muted-foreground text-center mb-8 text-base">
              {isLogin
                ? "Acesse o painel e emita suas notas"
                : "Cadastre-se para ver seu dinheiro com clareza com o Visor"}
            </p>

            {isLogin ? <LoginForm /> : <SignupForm />}

            <div className="mt-6 text-center text-sm text-muted-foreground">
              {isLogin ? (
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className="text-primary hover:underline font-medium"
                >
                  Não tem uma conta? Criar conta
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className="text-primary hover:underline font-medium"
                >
                  Já tem uma conta? Entrar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
