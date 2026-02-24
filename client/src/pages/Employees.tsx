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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEmployeeSchema, type Employee, type InsertEmployee, type Branch } from "@shared/schema";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

export default function Employees() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/employees");
      return response.json();
    },
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/branches");
      return response.json();
    },
  });

  const form = useForm<InsertEmployee>({
    resolver: zodResolver(insertEmployeeSchema),
    defaultValues: {
      name: "",
      position: "",
      phone: "",
      branchId: "",
      isActive: true,
    },
  });

  const addEmployeeMutation = useMutation({
    mutationFn: async (data: InsertEmployee) => {
      const response = await authenticatedApiRequest("POST", "/api/employees", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "Сотрудник добавлен",
        description: "Новый сотрудник успешно добавлен в систему",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось добавить сотрудника",
      });
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      await authenticatedApiRequest("DELETE", `/api/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Сотрудник удален",
        description: "Сотрудник успешно удален из системы",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось удалить сотрудника",
      });
    },
  });

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onSubmit = (data: InsertEmployee) => {
    addEmployeeMutation.mutate(data);
  };

  const handleDelete = (id: string) => {
    if (confirm("Вы уверены, что хотите удалить этого сотрудника?")) {
      deleteEmployeeMutation.mutate(id);
    }
  };

  const getBranchName = (branchId: string | null) => {
    if (!branchId) return "Не указан";
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || "Неизвестно";
  };

  const getUtilization = () => {
    return Math.floor(Math.random() * 40) + 60; // Mock utilization 60-100%
  };

  if (isLoading) {
    return (
      <div className="p-6" data-testid="employees-loading">
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
    <div className="p-6" data-testid="employees-page">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t("title_employees")}</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-employee">
              <Plus className="h-4 w-4 mr-2" />
              {t("add_employee")}
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-add-employee">
            <DialogHeader>
              <DialogTitle>{t("add_employee")}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("employee_name")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Введите имя сотрудника" data-testid="input-employee-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("employee_position")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Мастер, администратор..." data-testid="input-employee-position" />
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
                      <FormLabel>{t("employee_phone")}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="+7 (999) 123-45-67" data-testid="input-employee-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("employee_branch")}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-employee-branch">
                            <SelectValue placeholder="Выберите филиал" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    {t("cancel")}
                  </Button>
                  <Button type="submit" disabled={addEmployeeMutation.isPending} data-testid="button-save-employee">
                    {addEmployeeMutation.isPending ? "Сохранение..." : t("save")}
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
                placeholder={t("search_employees_placeholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-employees"
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
                  <TableHead>{t("employee_name")}</TableHead>
                  <TableHead>{t("employee_position")}</TableHead>
                  <TableHead>{t("employee_branch")}</TableHead>
                  <TableHead>{t("staff_utilization")}</TableHead>
                  <TableHead>{t("employee_status")}</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow data-testid="no-employees-row">
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? t("employees_not_found") : t("no_employees")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee) => {
                    const utilization = getUtilization();
                    return (
                      <TableRow key={employee.id} className="table-row" data-testid={`employee-row-${employee.id}`}>
                        <TableCell>
                          <div className="font-medium" data-testid={`text-employee-name-${employee.id}`}>
                            {employee.name}
                          </div>
                          {employee.phone && (
                            <div className="text-sm text-muted-foreground">{employee.phone}</div>
                          )}
                        </TableCell>
                        <TableCell data-testid={`text-employee-position-${employee.id}`}>
                          {employee.position}
                        </TableCell>
                        <TableCell data-testid={`text-employee-branch-${employee.id}`}>
                          {getBranchName(employee.branchId)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${utilization}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium" data-testid={`text-employee-utilization-${employee.id}`}>
                              {utilization}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={employee.isActive ? "default" : "secondary"}
                            className={employee.isActive ? "bg-success text-success-foreground" : ""}
                            data-testid={`badge-employee-status-${employee.id}`}
                          >
                            {employee.isActive ? t("active") : t("inactive")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Button variant="ghost" size="icon" data-testid={`button-edit-employee-${employee.id}`}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(employee.id)}
                              disabled={deleteEmployeeMutation.isPending}
                              data-testid={`button-delete-employee-${employee.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {filteredEmployees.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                {filteredEmployees.length} / {employees.length}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
