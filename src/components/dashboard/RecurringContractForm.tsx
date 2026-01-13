import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CNPJCPFInput } from "@/components/ui/masked-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type RecurringContractFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract?: {
    id: string;
    contract_name: string;
    amount: number;
    charge_day: number;
    service_description: string;
    client_id: string;
    auto_issue: boolean;
  } | null;
};

type FormData = {
  client_id: string;
  contract_name: string;
  amount: string;
  charge_day: number;
  service_description: string;
  auto_issue: boolean;
};

const quickClientSchema = z.object({
  razao_social: z
    .string()
    .trim()
    .min(2, "Nome é obrigatório")
    .max(200, "Nome muito longo"),
  cnpj: z
    .string()
    .trim()
    .min(11, "CNPJ/CPF inválido")
    .max(18, "CNPJ/CPF inválido"),
  email: z
    .string()
    .trim()
    .email("E-mail inválido")
    .max(255, "E-mail muito longo")
    .optional()
    .or(z.literal("")),
});

type QuickClientFormData = z.infer<typeof quickClientSchema>;

export function RecurringContractForm({
  open,
  onOpenChange,
  contract,
}: RecurringContractFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);
  const [clientComboOpen, setClientComboOpen] = useState(false);

  const form = useForm<FormData>({
    defaultValues: {
      client_id: "",
      contract_name: "",
      amount: "",
      charge_day: 1,
      service_description: "",
      auto_issue: true,
    },
  });

  const quickClientForm = useForm<QuickClientFormData>({
    resolver: zodResolver(quickClientSchema),
    defaultValues: {
      razao_social: "",
      cnpj: "",
      email: "",
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["clients", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, razao_social")
        .eq("user_id", user?.id)
        .order("razao_social");

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  useEffect(() => {
    if (contract) {
      const formattedAmount = contract.amount.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      form.reset({
        client_id: contract.client_id,
        contract_name: contract.contract_name,
        amount: formattedAmount,
        charge_day: contract.charge_day,
        service_description: contract.service_description,
        auto_issue: contract.auto_issue,
      });
    } else {
      form.reset({
        client_id: "",
        contract_name: "",
        amount: "",
        charge_day: 1,
        service_description: "",
        auto_issue: true,
      });
    }
  }, [contract, form]);

  const handleQuickClientSubmit = async (data: QuickClientFormData) => {
    if (!user?.id) return;

    setCreatingClient(true);
    try {
      const payload = {
        user_id: user.id,
        cnpj: data.cnpj.replace(/\D/g, ""),
        razao_social: data.razao_social,
        email: data.email || null,
      };

      const { data: insertedClient, error } = await supabase
        .from("clients")
        .insert(payload)
        .select("id, razao_social")
        .single();

      if (error) throw error;

      queryClient.setQueryData<any[]>(["clients", user.id], (prev) =>
        prev ? [...prev, insertedClient] : [insertedClient]
      );

      form.setValue("client_id", insertedClient.id, { shouldValidate: true });

      toast({ title: "Cliente criado com sucesso!" });

      setClientDialogOpen(false);
      quickClientForm.reset({ razao_social: "", cnpj: "", email: "" });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar o cliente.",
        variant: "destructive",
      });
    } finally {
      setCreatingClient(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!user?.id) return;

    // Verifica duplicidade antes de salvar (mesmo cliente + mesmo nome de contrato)
    if (!contract) {
      const { data: existing, error: duplicateError } = await supabase
        .from("recurring_contracts")
        .select("id")
        .eq("user_id", user.id)
        .eq("client_id", data.client_id)
        .ilike("contract_name", data.contract_name.trim());

      if (duplicateError) {
        toast({
          title: "Erro",
          description: "Não foi possível verificar contratos existentes.",
          variant: "destructive",
        });
        return;
      }

      if (existing && existing.length > 0) {
        toast({
          title: "Contrato duplicado",
          description:
            "Já existe um contrato com este nome para este cliente. Use um nome diferente.",
          variant: "destructive",
        });
        return;
      }
    }

    // Convert amount string back to number
    const amountNumber = parseFloat(data.amount.replace(/\./g, "").replace(",", "."));

    const contractData = {
      client_id: data.client_id,
      contract_name: data.contract_name,
      amount: amountNumber,
      charge_day: data.charge_day,
      service_description: data.service_description,
      user_id: user.id,
      status: "active",
      auto_issue: data.auto_issue,
    };

    let error;

    if (contract) {
      const { error: updateError } = await supabase
        .from("recurring_contracts")
        .update(contractData)
        .eq("id", contract.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("recurring_contracts")
        .insert(contractData);
      error = insertError;
    }

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar o contrato.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: contract
        ? "Contrato atualizado com sucesso."
        : "Contrato criado com sucesso.",
    });

    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-[540px]">
        <SheetHeader>
          <SheetTitle>
            {contract ? "Editar Contrato" : "Novo Contrato Recorrente"}
          </SheetTitle>
          <SheetDescription>
            Configure os detalhes do contrato de cobrança recorrente
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
            <FormField
              control={form.control}
              name="client_id"
              rules={{ required: "Selecione um cliente" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">
                    <span>Cliente</span>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => setClientDialogOpen(true)}
                    >
                      + Novo cliente
                    </button>
                  </FormLabel>
                  <Popover open={clientComboOpen} onOpenChange={setClientComboOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <button
                          type="button"
                          className={cn(
                            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-left ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <span className="truncate">
                            {field.value
                              ? clients?.find((client) => client.id === field.value)?.razao_social ??
                                "Cliente não encontrado"
                              : "Selecione o cliente"}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover z-50">
                      <Command>
                        <CommandInput placeholder="Buscar cliente..." />
                        <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                        <CommandGroup>
                          {clients?.map((client) => (
                            <CommandItem
                              key={client.id}
                              value={client.razao_social}
                              onSelect={() => {
                                form.setValue("client_id", client.id, { shouldValidate: true });
                                setClientComboOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  client.id === field.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {client.razao_social}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contract_name"
              rules={{ required: "Digite o nome do contrato" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Contrato</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Manutenção Mensal" {...field} />
                  </FormControl>
                  <FormDescription>
                    Um nome identificador para este contrato
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              rules={{
                required: "Digite o valor",
                min: { value: 0.01, message: "Valor deve ser maior que zero" },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor (R$)</FormLabel>
                  <FormControl>
                    <CurrencyInput
                      placeholder="R$ 0,00"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="charge_day"
              rules={{
                required: "Digite o dia",
                min: { value: 1, message: "Dia deve ser entre 1 e 31" },
                max: { value: 31, message: "Dia deve ser entre 1 e 31" },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dia de Execução</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      placeholder="Ex: 10"
                      value={field.value}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Dia do mês em que a cobrança será executada (1-31)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="service_description"
              rules={{ required: "Digite a descrição do serviço" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição do Serviço</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva os serviços incluídos neste contrato"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="auto_issue"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Emissão automática?</FormLabel>
                    <FormDescription>
                      Quando ligado, as cobranças deste contrato serão emitidas automaticamente
                      na data configurada. Quando desligado, será necessário aprovar manualmente
                      antes da emissão.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                {contract ? "Atualizar" : "Criar Contrato"}
              </Button>
            </div>
          </form>
        </Form>

        <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Novo Cliente</DialogTitle>
            </DialogHeader>

            <Form {...quickClientForm}>
              <form
                onSubmit={quickClientForm.handleSubmit(handleQuickClientSubmit)}
                className="space-y-4 mt-4"
              >
                <FormField
                  control={quickClientForm.control}
                  name="razao_social"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Razão social ou nome do cliente"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={quickClientForm.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ/CPF</FormLabel>
                      <FormControl>
                        <CNPJCPFInput
                          placeholder="00.000.000/0000-00 ou 000.000.000-00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={quickClientForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="contato@empresa.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setClientDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={creatingClient}
                  >
                    {creatingClient ? "Salvando..." : "Salvar cliente"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
