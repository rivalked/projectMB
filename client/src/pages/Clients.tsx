import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema, type Client, type InsertClient } from "@shared/schema";
import { Plus, Search, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

export default function Clients() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/clients");
      return response.json();
    },
  });

  const form = useForm<InsertClient>({
    resolver: zodResolver(insertClientSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      bonusPoints: 0,
    },
  });

  const addClientMutation = useMutation({
    mutationFn: async (data: InsertClient) => {
      const response = await authenticatedApiRequest("POST", "/api/clients", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "Клиент добавлен",
        description: "Новый клиент успешно добавлен в систему",
      });
    },
    onError: (error: any) => {
      // Try to map Zod field errors to the form when possible
      const msg = String(error?.message || "");
      const parts = msg.split("; ");
      const fieldErrors = parts
        .map((p) => p.split(": "))
        .filter((arr) => arr.length === 2) as [string, string][];
      fieldErrors.forEach(([path, message]) => {
        const name = path as keyof InsertClient;
        if (name && form.getFieldState(name)) {
          form.setError(name as any, { message });
        }
      });
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось добавить клиента",
      });
    },
  });

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  );

  const onSubmit = (data: InsertClient) => {
    addClientMutation.mutate(data);
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="p-6" data-testid="clients-loading">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-6"></div>
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="clients-page">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t("title_clients")}</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-client">
              <Plus className="h-4 w-4 mr-2" />
              {t("add_client")}
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-add-client" aria-describedby="add-client-desc">
            <DialogHeader>
              <DialogTitle>{t("add_client")}</DialogTitle>
            </DialogHeader>
            <p id="add-client-desc" className="text-sm text-muted-foreground">Заполните данные клиента. Поля имя и телефон обязательны.</p>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("client_name")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Введите имя клиента" data-testid="input-client-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("client_phone")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+7 (999) 123-45-67" data-testid="input-client-phone" />
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
                      <FormLabel>{t("client_email_optional")}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="email@example.com" data-testid="input-client-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    {t("cancel")}
                  </Button>
                  <Button type="submit" disabled={addClientMutation.isPending} data-testid="button-save-client">
                    {addClientMutation.isPending ? "Сохранение..." : t("save")}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("search_clients_placeholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-clients"
              />
            </div>
            <Button variant="outline" size="sm">
              {t("filters")}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table_name")}</TableHead>
                  <TableHead>{t("table_phone")}</TableHead>
                  <TableHead>{t("table_visits")}</TableHead>
                  <TableHead>{t("table_last_service")}</TableHead>
                  <TableHead>{t("table_bonus_balance")}</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length === 0 ? (
                  <TableRow data-testid="no-clients-row">
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? t("not_found") : t("no_clients")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => (
                    <TableRow key={client.id} className="table-row" data-testid={`client-row-${client.id}`}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {getUserInitials(client.name)}
                            </span>
                          </div>
                          <span className="font-medium" data-testid={`text-client-name-${client.id}`}>
                            {client.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-client-phone-${client.id}`}>
                        {client.phone}
                      </TableCell>
                      <TableCell data-testid={`text-client-visits-${client.id}`}>
                        {client.totalVisits || 0}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {client.lastVisit ? "Недавно" : "Не было"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-success/10 text-success" data-testid={`text-client-bonus-${client.id}`}>
                          {client.bonusPoints || 0} 
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" data-testid={`button-view-client-${client.id}`}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredClients.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                Показано {filteredClients.length} из {clients.length} клиентов
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
