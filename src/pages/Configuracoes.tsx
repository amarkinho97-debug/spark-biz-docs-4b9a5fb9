import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, ShieldCheck } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CNPJInput, CEPInput, PhoneInput } from "@/components/ui/masked-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Papa from "papaparse";

const profileSchema = z.object({
  razao_social: z.string().optional(),
  nome_fantasia: z.string().optional(),
  cnpj: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
  inscricao_municipal: z.string().optional(),
  endereco_fiscal: z.string().optional(),
  regime_tributario: z.string().optional(),
  logo_url: z.string().optional().or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function Configuracoes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [nbsImporting, setNbsImporting] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const enderecoInputRef = useRef<HTMLInputElement | null>(null);
  const lastFetchedCnpjRef = useRef<string | null>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      razao_social: "",
      cnpj: "",
      email: "",
      telefone: "",
      endereco: "",
      cidade: "",
      estado: "",
      cep: "",
      inscricao_municipal: "",
      endereco_fiscal: "",
      regime_tributario: "",
      logo_url: "",
    },
  });

  const logoUrl = form.watch("logo_url");

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      setLogoError("A logo deve ter no máximo 1MB");
      form.setValue("logo_url", "");
      return;
    }

    setLogoError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (result) {
        form.setValue("logo_url", result, { shouldDirty: true });
      }
    };
    reader.readAsDataURL(file);
  };

  const formatCnpj = (cnpj: string) => {
    const digits = cnpj?.replace(/\D/g, "") || "";
    if (digits.length === 14) {
      return digits.replace(
        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
        "$1.$2.$3/$4-$5"
      );
    }
    return cnpj || "";
  };

  const formatCep = (cep: string) => {
    const digits = cep?.replace(/\D/g, "") || "";
    if (digits.length === 8) {
      return digits.replace(/(\d{5})(\d{3})/, "$1-$2");
    }
    return cep || "";
  };
  
  const fetchAddressByCep = async (cep: string) => {
    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!response.ok) throw new Error("Erro ao buscar CEP");
      const data = await response.json();
  
      if (data.erro) {
        toast({
          variant: "destructive",
          title: "CEP não encontrado",
          description: "Verifique o CEP digitado.",
        });
        return;
      }
  
      const endereco = [data.logradouro, data.bairro].filter(Boolean).join(" - ");
      form.setValue("endereco", endereco);
      form.setValue("cidade", data.localidade || "");
      form.setValue("estado", data.uf || "");
      form.setValue("cep", formatCep(cep));
  
      enderecoInputRef.current?.focus();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao buscar CEP",
        description: "Tente novamente mais tarde.",
      });
    } finally {
      setCepLoading(false);
    }
  };

  const formatPhone = (phone: string) => {
    const digits = phone?.replace(/\D/g, "") || "";
    if (digits.length === 11) {
      return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    if (digits.length === 10) {
      return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }
    return phone || "";
  };

  // Auto-preenchimento de dados da empresa a partir do CNPJ (BrasilAPI),
  // espelhando o comportamento dos formulários de Clientes e Emissão,
  // mas mantendo a possibilidade de edição manual pelo usuário.
  const fetchCompanyDataByCnpj = async (cleanCnpj: string) => {
    try {
      setCnpjLoading(true);

      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "CNPJ não encontrado",
          description: "Não foi possível localizar os dados da empresa na Receita.",
        });
        return;
      }

      const data: any = await response.json();

      // Evita requisições duplicadas para o mesmo CNPJ
      lastFetchedCnpjRef.current = cleanCnpj;

      // Razão Social
      const currentRazao = form.getValues("razao_social");
      if (!currentRazao && (data.razao_social || data.nome_fantasia)) {
        form.setValue("razao_social", data.razao_social || data.nome_fantasia);
      }

      // CEP
      const currentCep = form.getValues("cep");
      if (!currentCep && data.cep) {
        form.setValue("cep", formatCep(data.cep));
      }

      // Endereço (logradouro, número, bairro)
      const currentEndereco = form.getValues("endereco");
      if (!currentEndereco) {
        const partesEndereco = [data.logradouro, data.numero, data.bairro]
          .filter((p: string | number | null | undefined) => !!p)
          .map(String);
        if (partesEndereco.length > 0) {
          form.setValue("endereco", partesEndereco.join(", "));
        }
      }

      // Cidade
      const currentCidade = form.getValues("cidade");
      if (!currentCidade && (data.municipio || data.localidade)) {
        form.setValue("cidade", data.municipio || data.localidade);
      }

      // UF
      const currentEstado = form.getValues("estado");
      if (!currentEstado && data.uf) {
        form.setValue("estado", data.uf);
      }

      // E-mail
      const currentEmail = form.getValues("email");
      if (!currentEmail && data.email) {
        form.setValue("email", data.email);
      }

      // Telefone
      const currentTelefone = form.getValues("telefone");
      if (!currentTelefone && data.telefone) {
        form.setValue("telefone", formatPhone(String(data.telefone)));
      }

      // Alerta se situação cadastral não for ATIVA
      const descricaoSituacao = data.descricao_situacao_cadastral || data.situacao_cadastral;
      if (descricaoSituacao && String(descricaoSituacao).toUpperCase() !== "ATIVA") {
        toast({
          variant: "destructive",
          title: "Atenção",
          description: `Esta empresa consta como ${descricaoSituacao} na Receita.\n`,
        });
      }
    } catch (error) {
      console.error("Erro ao buscar dados do CNPJ na BrasilAPI", error);
      toast({
        variant: "destructive",
        title: "Erro ao buscar CNPJ",
        description: "Não foi possível buscar os dados do CNPJ. Preencha os campos manualmente.",
      });
    } finally {
      setCnpjLoading(false);
    }
  };
  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        form.reset({
          razao_social: data.razao_social || "",
          nome_fantasia: data.nome_fantasia || "",
          cnpj: formatCnpj(data.cnpj || ""),
          email: data.email || "",
          telefone: formatPhone(data.telefone || ""),
          endereco: data.endereco || "",
          cidade: data.cidade || "",
          estado: data.estado || "",
          cep: formatCep(data.cep || ""),
          inscricao_municipal: data.inscricao_municipal || "",
          endereco_fiscal: data.endereco_fiscal || "",
          regime_tributario: data.regime_tributario || "",
          logo_url: data.logo_url || "",
        });
      }
      setLoading(false);
    }

    fetchProfile();
  }, [user, form]);

  const handleNbsCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!user) {
      toast({
        variant: "destructive",
        title: "Não autenticado",
        description: "Faça login para importar códigos NBS.",
      });
      return;
    }

    setNbsImporting(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = (results.data as any[])
            .map((row) => {
              const code =
                row.code || row.codigo || row.Codigo || row.CÓDIGO || row["Código"] || row["CODIGO"];
              const description =
                row.description ||
                row.descricao ||
                row.Descricao ||
                row["Descrição"] ||
                row["DESCRIÇÃO"];
              const category =
                row.category || row.categoria || row.Categoria || row["Categoria"] || null;

              if (!code || !description) return null;

              return {
                code: String(code).trim(),
                description: String(description).trim(),
                category: category ? String(category).trim() : null,
              };
            })
            .filter(Boolean) as { code: string; description: string; category: string | null }[];

          if (rows.length === 0) {
            toast({
              variant: "destructive",
              title: "CSV vazio",
              description: "Nenhuma linha válida encontrada para importação.",
            });
            return;
          }

          const { error } = await supabase.from("nbs_codes").upsert(rows, {
            onConflict: "code",
          });

          if (error) throw error;

          toast({
            title: "Importação concluída",
            description: `${rows.length} códigos NBS foram importados/atualizados com sucesso.`,
          });
        } catch (error: any) {
          console.error("Erro ao importar NBS", error);
          toast({
            variant: "destructive",
            title: "Erro na importação",
            description: error.message || "Não foi possível importar o CSV.",
          });
        } finally {
          setNbsImporting(false);
          event.target.value = "";
        }
      },
      error: (error) => {
        console.error("Erro ao ler CSV", error);
        toast({
          variant: "destructive",
          title: "Erro ao ler arquivo",
          description: "Verifique o formato do CSV e tente novamente.",
        });
        setNbsImporting(false);
      },
    });
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Não autenticado",
        description: "Faça login para salvar as configurações.",
      });
      return;
    }
    
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            razao_social: data.razao_social || null,
            nome_fantasia: data.nome_fantasia || null,
            cnpj: data.cnpj?.replace(/\D/g, "") || null,
            email: data.email || null,
            telefone: data.telefone?.replace(/\D/g, "") || null,
            endereco: data.endereco || null,
            cidade: data.cidade || null,
            estado: data.estado || null,
            cep: data.cep?.replace(/\D/g, "") || null,
            inscricao_municipal: data.inscricao_municipal || null,
            endereco_fiscal: data.endereco_fiscal || null,
            regime_tributario: data.regime_tributario || null,
            logo_url: data.logo_url || null,
          },
          {
            onConflict: "id",
          },
        );

      if (error) {
        console.error("Erro ao salvar perfil:", error);
        throw error;
      }

      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Erro ao salvar perfil.",
      });
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as informações da sua empresa
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados da Empresa</CardTitle>
            <CardDescription>
              Estas informações serão usadas nas notas fiscais emitidas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="razao_social"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Razão Social</FormLabel>
                        <FormControl>
                          <Input placeholder="Razão social da empresa" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nome_fantasia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Fantasia</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome fantasia (opcional)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cnpj"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNPJ</FormLabel>
                        <FormControl>
                          <CNPJInput
                            placeholder="00.000.000/0000-00"
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={async () => {
                              const digits = (field.value || "").replace(/\D/g, "");

                              if (digits.length !== 14) return;
                              if (cnpjLoading) return;
                              if (lastFetchedCnpjRef.current === digits) return;

                              await fetchCompanyDataByCnpj(digits);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="contato@empresa.com"
                            type="email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="endereco"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Rua, número, complemento"
                          {...field}
                          ref={(el) => {
                            field.ref(el);
                            enderecoInputRef.current = el;
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="logo_url"
                  render={() => (
                    <FormItem>
                      <FormLabel>Logotipo da Empresa</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col gap-2">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoFileChange}
                              className="text-sm text-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-primary/10 file:text-primary file:text-xs hover:file:bg-primary/20"
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  form.setValue("logo_url", "", { shouldDirty: true });
                                  setLogoError(null);
                                }}
                                className="h-7 px-2 text-xs"
                              >
                                Remover logo
                              </Button>
                            </div>
                            {logoError && (
                              <p className="text-xs text-destructive">{logoError}</p>
                            )}
                          </div>
                          {logoUrl && (
                            <div className="h-10 w-28 overflow-hidden rounded-md border border-border bg-muted/40 flex items-center justify-center">
                              <img
                                src={logoUrl}
                                alt="Pré-visualização do logotipo"
                                className="h-8 w-auto object-contain"
                              />
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="cidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input placeholder="Cidade" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="estado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <FormControl>
                          <Input placeholder="UF" maxLength={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <CEPInput
                              placeholder="00000-000"
                              value={field.value}
                              onChange={(event) => {
                                field.onChange(event);
                                const value = event.target.value;
                                const digits = value.replace(/\D/g, "");
                                if (digits.length === 8) {
                                  fetchAddressByCep(digits);
                                }
                              }}
                            />
                            {cepLoading && (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="inscricao_municipal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inscrição Municipal</FormLabel>
                        <FormControl>
                          <Input placeholder="Número da inscrição municipal" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="regime_tributario"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Regime Tributário</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Selecione o regime tributário" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-background z-50">
                            <SelectItem value="1">Simples Nacional</SelectItem>
                            <SelectItem value="4">Simples Nacional - MEI</SelectItem>
                            <SelectItem value="2">Lucro Presumido</SelectItem>
                            <SelectItem value="3">Lucro Real</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="endereco_fiscal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço Fiscal</FormLabel>
                      <FormControl>
                        <Input placeholder="Endereço utilizado na prefeitura (se diferente do principal)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-cta hover:bg-cta/90"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar Alterações
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Certificado Digital (A1)</CardTitle>
            <CardDescription>
              Configure o certificado utilizado para comunicação segura com a
              prefeitura.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 px-3 py-1 text-xs font-medium">
                <ShieldCheck className="h-4 w-4 mr-1" />
                Certificado Ativo (Vence em 20/05/2026)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Arquivo do Certificado (.pfx / .p12)</Label>
                <Input
                  type="file"
                  accept=".pfx,.p12"
                  className="cursor-pointer"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;

                    const extension = file.name.split(".").pop()?.toLowerCase();
                    if (!extension || !["pfx", "p12"].includes(extension)) {
                      toast({
                        variant: "destructive",
                        title: "Formato inválido",
                        description:
                          "Envie apenas arquivos .pfx ou .p12 do certificado A1.",
                      });
                      event.target.value = "";
                      return;
                    }

                    toast({
                      title: "Certificado selecionado",
                      description:
                        "O arquivo foi selecionado com sucesso. O envio seguro será configurado em breve.",
                    });
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Senha do Certificado</Label>
                <Input
                  type="password"
                  placeholder="Informe a senha do arquivo A1"
                  maxLength={64}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Seu certificado é criptografado e usado apenas para comunicação
              com a Prefeitura.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Banco de Dados NBS</CardTitle>
            <CardDescription>
              Importe uma planilha em CSV com códigos NBS para acelerar o
              preenchimento das notas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O arquivo deve conter ao menos as colunas <span className="font-semibold">code</span> e
              <span className="font-semibold"> description</span>. Opcionalmente, inclua a coluna
              <span className="font-semibold"> category</span>.
            </p>
            <div className="space-y-2">
              <Label>Arquivo CSV de códigos NBS</Label>
              <Input
                type="file"
                accept=".csv"
                className="cursor-pointer"
                disabled={nbsImporting}
                onChange={handleNbsCsvUpload}
              />
              <p className="text-xs text-muted-foreground">
                {nbsImporting
                  ? "Importando códigos NBS... aguarde."
                  : "Tamanho máximo recomendado: 5MB."}
              </p>
            </div>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}
