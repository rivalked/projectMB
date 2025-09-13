import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  insertBranchSchema, 
  type Branch, 
  type InsertBranch,
  type Employee,
  type Client
} from "@shared/schema";
import { Plus, Search, Edit, Trash2, Building, Users, MapPin, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Branches() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: branches = [], isLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/branches");
      return response.json();
    },
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/employees");
      return response.json();
    },
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/clients");
      return response.json();
    },
  });

  const form = useForm<InsertBranch>({
    resolver: zodResolver(insertBranchSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
    },
  });

  const addBranchMutation = useMutation({
    mutationFn: async (data: InsertBranch) => {
      const response = await authenticatedApiRequest("POST", "/api/branches", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "Филиал добавлен",
        description: "Новый филиал успешно добавлен в систему",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось добавить филиал",
      });
    },
  });

  const deleteBranchMutation = useMutation({
    mutationFn: async (id: string) => {
      await authenticatedApiRequest("DELETE", `/api/branches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      toast({
        title: "Филиал удален",
        description: "Филиал успешно удален из системы",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось удалить филиал",
      });
    },
  });

  const filteredBranches = branches.filter(branch =>
    branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onSubmit = (data: InsertBranch) => {
    addBranchMutation.mutate(data);
  };

  const handleDelete = (id: string) => {
    const branchEmployees = employees.filter(emp => emp.branchId === id);
    if (branchEmployees.length > 0) {
      toast({
        variant: "destructive",
        title: "Невозможно удалить филиал",
        description: "В филиале работают сотрудники. Сначала переведите их в другие филиалы.",
      });
      return;
    }

    if (confirm("Вы уверены, что хотите удалить этот филиал?")) {
      deleteBranchMutation.mutate(id);
    }
  };

  const getBranchEmployeeCount = (branchId: string) => {
    return employees.filter(emp => emp.branchId === branchId).length;
  };

  const getBranchClientCount = (branchId: string) => {
    // In a real app, you'd track which clients belong to which branch
    // For now, we'll distribute clients evenly among branches
    return Math.floor(clients.length / Math.max(branches.length, 1));
  };

  if (isLoading) {
    return (
      <div className="p-6" data-testid="branches-loading">
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
    <div className="p-6" data-testid="branches-page">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Филиалы</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-branch">
              <Plus className="h-4 w-4 mr-2" />
              Добавить филиал
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-add-branch">
            <DialogHeader>
              <DialogTitle>Добавить новый филиал</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название филиала</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Введите название филиала" data-testid="input-branch-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Адрес</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Введите полный адрес филиала" data-testid="input-branch-address" />
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
                      <FormLabel>Телефон (необязательно)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="+7 (495) 123-45-67" data-testid="input-branch-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Отмена
                  </Button>
                  <Button type="submit" disabled={addBranchMutation.isPending} data-testid="button-save-branch">
                    {addBranchMutation.isPending ? "Сохранение..." : "Сохранить"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card data-testid="stats-total-branches">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Всего филиалов</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-branches">
                  {branches.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Building className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stats-total-employees">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Всего сотрудников</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-employees">
                  {employees.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stats-avg-employees">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Среднее сотр./филиал</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-avg-employees">
                  {branches.length > 0 ? Math.round(employees.length / branches.length) : 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию или адресу..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-branches"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Адрес</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>Сотрудники</TableHead>
                  <TableHead>Клиенты</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBranches.length === 0 ? (
                  <TableRow data-testid="no-branches-row">
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? "Филиалы не найдены" : "Нет добавленных филиалов"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBranches.map((branch) => (
                    <TableRow key={branch.id} className="table-row" data-testid={`branch-row-${branch.id}`}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Building className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium" data-testid={`text-branch-name-${branch.id}`}>
                              {branch.name}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start space-x-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground" data-testid={`text-branch-address-${branch.id}`}>
                            {branch.address}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {branch.phone ? (
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm" data-testid={`text-branch-phone-${branch.id}`}>
                              {branch.phone}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Не указан</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium" data-testid={`text-branch-employees-${branch.id}`}>
                            {getBranchEmployeeCount(branch.id)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium" data-testid={`text-branch-clients-${branch.id}`}>
                            {getBranchClientCount(branch.id)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button variant="ghost" size="icon" data-testid={`button-edit-branch-${branch.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(branch.id)}
                            disabled={deleteBranchMutation.isPending}
                            data-testid={`button-delete-branch-${branch.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredBranches.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                Показано {filteredBranches.length} из {branches.length} филиалов
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
