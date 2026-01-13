import { useState, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Loader2, Users, Search } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CNPJCPFInput, CEPInput } from "@/components/ui/masked-input";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { validateCPForCNPJ } from "@/lib/documentValidation";

const clientSchema = z.object({
  cnpj: z.string().min(11, "CNPJ/CPF inválido").max(18, "CNPJ/CPF inválido"),
  razao_social: z.string().min(2, "Razão Social é obrigatória").max(200, "Nome muito longo"),
  email: z.string().email("E-mail inválido").max(255, "E-mail muito longo").optional().or(z.literal("")),
  endereco: z.string().max(500, "Endereço muito longo").optional(),
  cidade: z.string().max(100, "Cidade muito longa").optional(),
  estado: z.string().max(2, "Use a sigla do estado").optional(),
  cep: z.string().max(10, "CEP inválido").optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface Client {
  id: string;
  cnpj: string;
  razao_social: string;
  email: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
}

export default function Clientes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const enderecoInputRef = useRef<HTMLInputElement | null>(null);
  const lastFetchedCnpjRef = useRef<string | null>(null);

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      cnpj: "",
      razao_social: "",
      email: "",
      endereco: "",
      cidade: "",
      estado: "",
      cep: "",
    },
  });

  const fetchClients = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os clientes.",
      });
    } else {
      setClients(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, [user]);

  // Filter clients by search query
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    
    const query = searchQuery.toLowerCase();
    return clients.filter(
      (client) =>
        client.razao_social.toLowerCase().includes(query) ||
        client.cnpj.includes(query.replace(/\D/g, ""))
    );
  }, [clients, searchQuery]);

  const openNewClientDialog = () => {
    setEditingClient(null);
    form.reset({
      cnpj: "",
      razao_social: "",
      email: "",
      endereco: "",
      cidade: "",
      estado: "",
      cep: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    form.reset({
      cnpj: formatCnpj(client.cnpj),
      razao_social: client.razao_social,
      email: client.email || "",
      endereco: client.endereco || "",
      cidade: client.cidade || "",
      estado: client.estado || "",
      cep: formatCep(client.cep || ""),
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: ClientFormData) => {
    if (!user) return;
    setSubmitting(true);

    try {
      if (editingClient) {
        const { error } = await supabase
          .from("clients")
          .update({
            cnpj: data.cnpj.replace(/\D/g, ""),
            razao_social: data.razao_social,
            email: data.email || null,
            endereco: data.endereco || null,
            cidade: data.cidade || null,
            estado: data.estado || null,
            cep: data.cep?.replace(/\D/g, "") || null,
          })
          .eq("id", editingClient.id);

        if (error) throw error;
        toast({ title: "Cliente atualizado com sucesso!" });
      } else {
        const { error } = await supabase.from("clients").insert({
          user_id: user.id,
          cnpj: data.cnpj.replace(/\D/g, ""),
          razao_social: data.razao_social,
          email: data.email || null,
          endereco: data.endereco || null,
          cidade: data.cidade || null,
          estado: data.estado || null,
          cep: data.cep?.replace(/\D/g, "") || null,
        });

        if (error) throw error;
        toast({ title: "Cliente criado com sucesso!" });
      }

      setDialogOpen(false);
      fetchClients();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Erro ao salvar cliente.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingClient || !user) return;

    try {
      // Log the deletion action with client backup
      const { error: logError } = await supabase.from("audit_logs").insert({
        invoice_id: "00000000-0000-0000-0000-000000000000", // Placeholder since audit_logs requires invoice_id
        event_type: "CLIENT_DELETED",
        message: `Client ${deletingClient.razao_social} (${formatCnpj(deletingClient.cnpj)}) deleted by user`,
        payload: {
          client: deletingClient,
          user_id: user.id,
          timestamp: new Date().toISOString(),
        } as any,
      });

      if (logError) {
        console.error("Failed to log client deletion:", logError);
      }

      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", deletingClient.id);

      if (error) throw error;
      toast({ title: "Cliente excluído com sucesso!" });
      setDeleteDialogOpen(false);
      fetchClients();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Erro ao excluir cliente.",
      });
    }
  };

  const formatCnpj = (cnpj: string) => {
    const digits = cnpj.replace(/\D/g, "");
    if (digits.length === 14) {
      return digits.replace(
        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
        "$1.$2.$3/$4-$5"
      );
    }
    if (digits.length === 11) {
      return digits.replace(
        /(\d{3})(\d{3})(\d{3})(\d{2})/,
        "$1.$2.$3-$4"
      );
    }
    return cnpj;
  };

  const formatCep = (cep: string) => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length === 8) {
      return digits.replace(/(\d{5})(\d{3})/, "$1-$2");
    }
    return cep;
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

  // Auto-preenchimento de dados do cliente a partir do CNPJ (BrasilAPI),
  // espelhando o comportamento da tela de emissão de nota, mas sem alterar
  // nenhuma lógica existente lá.
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

      // Alerta se situação cadastral não for ATIVA
      const descricaoSituacao = data.descricao_situacao_cadastral || data.situacao_cadastral;
      if (descricaoSituacao && String(descricaoSituacao).toUpperCase() !== "ATIVA") {
        toast({
          variant: "destructive",
          title: "Atenção",
          description: `Esta empresa consta como ${descricaoSituacao} na Receita.
`,
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
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Meus Clientes</h1>
            <p className="text-muted-foreground">
              Gerencie seus tomadores de serviço
            </p>
          </div>
          <Button
            onClick={openNewClientDialog}
            className="bg-cta hover:bg-cta/90 shadow-cta"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        </div>

        {/* Search */}
        {clients.length > 0 && (
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CNPJ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhum cliente cadastrado</h3>
              <p className="text-muted-foreground text-center mb-4">
                Cadastre seus clientes para agilizar a emissão de notas.
              </p>
              <Button
                onClick={openNewClientDialog}
                className="bg-cta hover:bg-cta/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar primeiro cliente
              </Button>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <p className="text-muted-foreground">Nenhum cliente encontrado.</p>
            </div>
          ) : (
            <div className="w-full">
              {/* Mobile cards */}
              <div className="block md:hidden">
                <div className="p-4 space-y-3">
                  {filteredClients.map((client) => {
                    const initials = client.razao_social
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase())
                      .join("") || "?";

                    return (
                      <div
                        key={client.id}
                        className="p-4 bg-card shadow-sm rounded-lg flex items-center justify-between gap-3 border border-border"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {client.razao_social}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {formatCnpj(client.cnpj)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                            onClick={() => openEditDialog(client)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={() => {
                              setDeletingClient(client);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Desktop table */}
              <div className="hidden md:block w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Razão Social</TableHead>
                      <TableHead>CNPJ/CPF</TableHead>
                      <TableHead className="hidden sm:table-cell">E-mail</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">
                          {client.razao_social}
                        </TableCell>
                        <TableCell>{formatCnpj(client.cnpj)}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {client.email || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                            onClick={() => openEditDialog(client)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={() => {
                              setDeletingClient(client);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? "Editar Cliente" : "Novo Cliente"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ/CPF</FormLabel>
                      <FormControl>
                        <CNPJCPFInput
                          placeholder="00.000.000/0000-00"
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={async (event) => {
                            field.onBlur();
                            const raw = event.target.value || "";
                            const digits = raw.replace(/\D/g, "");

                            if (digits.length !== 14) return;

                            const isValid = validateCPForCNPJ(raw);
                            if (!isValid) {
                              toast({
                                variant: "destructive",
                                title: "CNPJ inválido",
                                description: "Verifique o número digitado.",
                              });
                              return;
                            }

                            if (cnpjLoading || lastFetchedCnpjRef.current === digits) {
                              return;
                            }

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
                  name="razao_social"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razão Social</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome da empresa" {...field} />
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

                <div className="grid grid-cols-3 gap-4">
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

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-cta hover:bg-cta/90"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : editingClient ? (
                      "Salvar"
                    ) : (
                      "Criar"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O cliente{" "}
                <strong>{deletingClient?.razao_social}</strong> será removido
                permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
