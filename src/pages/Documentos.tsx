import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, UploadCloud, Loader2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const mockImpostos = [
  {
    id: 1,
    nome: "DAS Simples Nacional 01/2026",
    vencimento: "20/02/2026",
    valor: "R$ 1.250,00",
    status: "Pendente",
  },
  {
    id: 2,
    nome: "DARF IRPJ Trimestral",
    vencimento: "30/04/2026",
    valor: "R$ 3.800,00",
    status: "Pago",
  },
];

const mockDocumentosEmpresa = [
  {
    id: 1,
    nome: "Contrato Social Atualizado",
    atualizadoEm: "10/01/2026",
  },
  {
    id: 2,
    nome: "Comprovante de Endereço",
    atualizadoEm: "05/01/2026",
  },
];

interface DocumentFile {
  name: string;
  path: string;
  created_at: string | null;
  updated_at: string | null;
  size: number | null;
}

function formatFileSize(size: number | null): string {
  if (!size) return "-";
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

export default function Documentos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchFiles = async () => {
    if (!user) return;
    setLoadingFiles(true);

    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .list(user.id, {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        });

      if (error) throw error;

      const mapped: DocumentFile[] =
        data?.map((obj: any) => ({
          name: obj.name,
          path: `${user.id}/${obj.name}`,
          created_at: obj.created_at ?? null,
          updated_at: obj.updated_at ?? null,
          size: (obj.metadata?.size as number | undefined) ?? null,
        })) ?? [];

      setFiles(mapped);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar documentos",
        description: error.message || "Tente novamente mais tarde.",
      });
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!user || !fileList || fileList.length === 0) return;

    const filesArray = Array.from(fileList);

    setUploading(true);
    try {
      for (const file of filesArray) {
        if (file.size > 20 * 1024 * 1024) {
          toast({
            variant: "destructive",
            title: "Arquivo muito grande",
            description: `${file.name} ultrapassa o limite de 20MB.`,
          });
          continue;
        }

        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage
          .from("documents")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (error) throw error;
      }

      toast({
        title: "Upload concluído",
        description: "Seus documentos foram enviados com sucesso.",
      });
      fetchFiles();
      event.target.value = "";
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar documentos",
        description: error.message || "Tente novamente mais tarde.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file: DocumentFile) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(file.path, 60);

      if (error || !data?.signedUrl) throw error || new Error("URL inválida");

      window.open(data.signedUrl, "_blank");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao baixar arquivo",
        description: error.message || "Tente novamente mais tarde.",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6 w-full overflow-x-hidden">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Documentos &amp; impostos
          </h1>
          <p className="text-muted-foreground max-w-2xl text-base">
            Área segura para troca de documentos entre você e seu contador.
          </p>
        </div>

        <div className="max-w-[calc(100vw-32px)] overflow-x-auto pb-2">
          <Tabs defaultValue="impostos" className="space-y-4 w-full max-w-full">
            <div className="w-full max-w-[100vw] overflow-x-auto no-scrollbar">
              <TabsList className="flex w-max min-w-full whitespace-nowrap">
                <TabsTrigger value="impostos">Impostos a Pagar</TabsTrigger>
                <TabsTrigger value="documentos">Documentos da Empresa</TabsTrigger>
                <TabsTrigger value="envios">Envios Pendentes</TabsTrigger>
              </TabsList>
            </div>

          <TabsContent value="impostos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold md:text-2xl">Impostos enviados pelo contador</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[120px] text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockImpostos.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.nome}</TableCell>
                          <TableCell>{item.vencimento}</TableCell>
                          <TableCell>{item.valor}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                item.status === "Pago"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                              }`}
                            >
                              {item.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" className="gap-2">
                              <Download className="h-4 w-4" />
                              <span className="hidden sm:inline">Download</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="md:hidden w-full max-w-full overflow-x-hidden">
                  <div className="space-y-3 w-full max-w-full">
                    {mockImpostos.map((item) => (
                      <div
                        key={item.id}
                        className="bg-card p-3 rounded-lg border border-border shadow-sm w-full max-w-full"
                      >
                        {/* Header: título + badge empilhados com pouco espaçamento */}
                        <div className="flex flex-col items-start gap-1 w-full mb-1">
                          <div className="flex items-center gap-2 w-full min-w-0">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <p className="font-semibold text-foreground text-sm break-all w-0 flex-1">
                              {item.nome}
                            </p>
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium shrink-0 ${
                              item.status === "Pago"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>

                        {/* Linha 2: vencimento + valor com fundo sutil */}
                        <div className="mt-1 grid grid-cols-2 gap-3 items-start text-xs text-muted-foreground w-full bg-muted/40 rounded-md p-2">
                          <div className="space-y-0.5">
                            <p className="font-medium text-foreground text-[11px]">Vencimento</p>
                            <p>{item.vencimento}</p>
                          </div>
                          <div className="text-right space-y-0.5">
                            <p className="font-medium text-foreground text-[11px]">Valor</p>
                            <p className="text-base font-semibold text-foreground">
                              {item.valor}
                            </p>
                          </div>
                        </div>

                        {/* Botão */}
                        <div className="pt-3 w-full">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-center gap-2 py-2"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documentos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Documentos da Empresa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Documento</TableHead>
                        <TableHead>Atualizado em</TableHead>
                        <TableHead className="w-[120px] text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockDocumentosEmpresa.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell>{doc.nome}</TableCell>
                          <TableCell>{doc.atualizadoEm}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" className="gap-2">
                              <Download className="h-4 w-4" />
                              <span className="hidden sm:inline">Baixar</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-3 md:hidden w-full max-w-full overflow-hidden">
                  {mockDocumentosEmpresa.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-card p-4 rounded-lg border border-border shadow-sm space-y-2 w-full max-w-full"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <p className="font-semibold text-foreground text-sm flex-1 break-words">
                            {doc.nome}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          Atualizado em {doc.atualizadoEm}
                        </span>
                      </div>

                      <div className="pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 w-full justify-center py-2"
                        >
                          <Download className="h-4 w-4" />
                          <span>Baixar</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="envios" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Envie documentos para o contador</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center gap-3 bg-muted/40 text-center">
                  <UploadCloud className="h-8 w-8 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Arraste e solte aqui seus comprovantes e documentos
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Aceita PDF, JPG e PNG. Tamanho máximo de 20MB por arquivo.
                    </p>
                  </div>
                  <div className="mt-2">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="sr-only">Selecionar arquivos</span>
                      <Button variant="outline" className="gap-2" asChild>
                        <span>
                          {uploading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <UploadCloud className="h-4 w-4 mr-2" />
                          )}
                          {uploading ? "Enviando..." : "Selecionar arquivos"}
                        </span>
                      </Button>
                    </label>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleUpload}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-foreground">
                    Seus envios recentes
                  </h3>
                  <div className="bg-card rounded-lg border border-border overflow-hidden">
                    {loadingFiles ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    ) : files.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                        <p className="text-sm text-muted-foreground">
                          Nenhum documento enviado ainda. Envie o primeiro para que seu contador possa analisar.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="hidden md:block">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Arquivo</TableHead>
                                <TableHead>Tamanho</TableHead>
                                <TableHead>Enviado em</TableHead>
                                <TableHead className="w-[120px] text-right">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {files.map((file) => (
                                <TableRow key={file.path}>
                                  <TableCell>{file.name}</TableCell>
                                  <TableCell>{formatFileSize(file.size)}</TableCell>
                                  <TableCell>
                                    {file.created_at
                                      ? new Date(file.created_at).toLocaleString("pt-BR")
                                      : "-"}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-2"
                                      onClick={() => handleDownload(file)}
                                    >
                                      <Download className="h-4 w-4" />
                                      <span className="hidden sm:inline">Download</span>
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        <div className="space-y-3 md:hidden p-3">
                          {files.map((file) => (
                            <div
                              key={file.path}
                              className="bg-card p-4 rounded-lg border border-border shadow-sm space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <p className="font-semibold text-foreground text-sm break-words">
                                    {file.name}
                                  </p>
                                </div>
                              </div>

                              <p className="text-xs text-muted-foreground">
                                Tamanho: {formatFileSize(file.size)}
                              </p>

                              <p className="text-xs text-muted-foreground">
                                Enviado em:{" "}
                                {file.created_at
                                  ? new Date(file.created_at).toLocaleString("pt-BR")
                                  : "-"}
                              </p>

                              <div className="pt-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2 w-full justify-center"
                                  onClick={() => handleDownload(file)}
                                >
                                  <Download className="h-4 w-4" />
                                  <span>Download</span>
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Assim que você enviar, seu contador será notificado e poderá
                  conferir os documentos.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}
