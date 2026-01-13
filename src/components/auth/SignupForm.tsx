import React, { Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { CPFInput } from "@/components/ui/masked-input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const TermsModal = React.lazy(() => import("../legal/TermsModal").then(m => ({ default: m.TermsModal })));
const baseSchema = z.object({
  nome: z
    .string()
    .trim()
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .optional(),
  sobrenome: z
    .string()
    .trim()
    .max(100, "Sobrenome deve ter no máximo 100 caracteres")
    .optional(),
  email: z.string().trim().email("E-mail inválido"),
  confirmEmail: z.string().trim().email("E-mail inválido").optional(),
  cpf: z.string().trim().max(14, "CPF inválido").optional(),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z
    .string()
    .min(6, "Senha deve ter pelo menos 6 caracteres")
    .optional(),
  termsAccepted: z.boolean().optional(),
  analyticsConsent: z.boolean().optional(),
  autoIdentificationConsent: z.boolean().optional(),
});

const signupSchema = baseSchema
  .extend({
    nome: z.string().trim().nonempty("Informe seu nome"),
    sobrenome: z.string().trim().nonempty("Informe seu sobrenome"),
    confirmEmail: z.string().trim().email("E-mail inválido"),
    cpf: z.string().trim().min(11, "CPF inválido"),
    confirmPassword: z
      .string()
      .min(6, "Senha deve ter pelo menos 6 caracteres"),
    termsAccepted: z.literal(true, {
      errorMap: () => ({ message: "Você precisa aceitar os termos para continuar" }),
    }),
  })
  .refine((data) => data.email === data.confirmEmail, {
    path: ["confirmEmail"],
    message: "Os e-mails não coincidem",
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem",
  });

export type SignupFormData = z.infer<typeof baseSchema>;

export function SignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const { signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      nome: "",
      sobrenome: "",
      email: "",
      confirmEmail: "",
      cpf: "",
      password: "",
      confirmPassword: "",
      termsAccepted: false,
      analyticsConsent: false,
      autoIdentificationConsent: false,
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);

    try {
      const { error } = await signUp(data.email, data.password, {
        first_name: data.nome,
        last_name: data.sobrenome,
        cpf: data.cpf,
        consents: {
          analytics_consent: data.analyticsConsent ?? false,
          auto_identification_consent: data.autoIdentificationConsent ?? false,
          terms_accepted: data.termsAccepted ?? false,
        },
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          toast({
            variant: "destructive",
            title: "Erro ao cadastrar",
            description: "Este e-mail já está cadastrado. Tente fazer login.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Erro ao cadastrar",
            description: error.message,
          });
        }
      } else {
        toast({
          title: "Conta criada!",
          description: "Você já pode acessar o sistema.",
        });
        navigate("/dashboard");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Seu nome" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sobrenome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sobrenome</FormLabel>
                <FormControl>
                  <Input placeholder="Seu sobrenome" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="seu@email.com"
                    type="email"
                    className="pl-10"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirme seu e-mail</FormLabel>
              <FormControl>
                <Input
                  placeholder="Repita seu e-mail"
                  type="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cpf"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CPF</FormLabel>
              <FormControl>
                <CPFInput placeholder="000.000.000-00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="••••••••"
                      type="password"
                      className="pl-10"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar senha</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Repita a senha"
                    type="password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3 rounded-2xl bg-muted/40 px-4 py-3">
          <FormField
            control={form.control}
            name="termsAccepted"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-xs md:text-sm font-normal">
                    Li e concordo com os
                    {" "}
                    <button
                      type="button"
                      onClick={() => setIsTermsOpen(true)}
                      className="text-primary hover:underline font-medium"
                    >
                      Termos de Serviço e Política de Privacidade
                    </button>
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="analyticsConsent"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-xs md:text-sm font-normal text-muted-foreground">
                    Concordo com o uso de analytics para melhorar minha experiência no produto.
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="autoIdentificationConsent"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-xs md:text-sm font-normal text-muted-foreground">
                    Concordo com a identificação automática de oportunidades e riscos financeiros.
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />
        </div>

        <Suspense fallback={null}>
          {isTermsOpen && (
            <TermsModal open={isTermsOpen} onOpenChange={setIsTermsOpen} />
          )}
        </Suspense>

        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold"
          variant="cta"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Criando conta...
            </>
          ) : (
            "Criar conta"
          )}
        </Button>
      </form>
    </Form>
  );
}
