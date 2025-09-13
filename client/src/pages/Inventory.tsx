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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  insertInventorySchema, 
  type Inventory, 
  type InsertInventory,
  type Branch
} from "@shared/schema";
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const unitOptions = [
  "шт",
  "мл",
  "л",
  "г",
  "кг",
  "упаковка",
  "тюбик",
  "флакон"
];

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const { toast } = useToast();

  const { data: inventory = [], isLoading } = useQuery<Inventory[]>({
    queryKey: ["/api/inventory"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/inventory");
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

  const form = useForm<InsertInventory>({
    resolver: zodResolver(insertInventorySchema),
    defaultValues: {
      name: "",
      quantity: 0,
      unit: "",
      minQuantity: 0,
      branchId: "",
    },
  });

  const addInventoryMutation = useMutation({
    mutationFn: async (data: InsertInventory) => {
      const response = await authenticatedApiRequest("POST", "/api/inventory", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "Материал добавлен",
        description: "Новый материал успешно добавлен на склад",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось добавить материал",
      });
    },
  });

  const deleteInventoryMutation = useMutation({
    mutationFn: async (id: string) => {
      await authenticatedApiRequest("DELETE", `/api/inventory/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({
        title: "Материал удален",
        description: "Материал успешно удален со склада",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось удалить материал",
      });
    },
  });

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = selectedBranch === "all" || item.branchId === selectedBranch;
    return matchesSearch && matchesBranch;
  });

  const lowStockItems = inventory.filter(item => item.quantity <= (item.minQuantity || 0));

  const onSubmit = (data: InsertInventory) => {
    addInventoryMutation.mutate(data);
  };

  const handleDelete = (id: string) => {
    if (confirm("Вы уверены, что хотите удалить этот материал?")) {
      deleteInventoryMutation.mutate(id);
    }
  };

  const getBranchName = (branchId: string | null) => {
    if (!branchId) return "Общий склад";
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || "Неизвестный филиал";
  };

  const getStockStatus = (item: Inventory) => {
    if (item.quantity === 0) return "out";
    if (item.quantity <= item.minQuantity) return "low";
    return "good";
  };

  const getStockStatusBadge = (status: string) => {
    switch (status) {
      case "out":
        return <Badge variant="destructive" className="text-xs">Закончилось</Badge>;
      case "low":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">Мало</Badge>;
      case "good":
        return <Badge variant="default" className="bg-success text-success-foreground text-xs">В наличии</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6" data-testid="inventory-loading">
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
    <div className="p-6" data-testid="inventory-page">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Склад</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-inventory">
              <Plus className="h-4 w-4 mr-2" />
              Добавить материал
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-add-inventory">
            <DialogHeader>
              <DialogTitle>Добавить новый материал</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название материала</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Введите название материала" data-testid="input-inventory-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Количество</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            placeholder="0"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            data-testid="input-inventory-quantity"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Единица измерения</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-inventory-unit">
                              <SelectValue placeholder="Выберите единицу" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {unitOptions.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="minQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Минимальное количество</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="0"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-inventory-min-quantity"
                        />
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
                      <FormLabel>Филиал</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-inventory-branch">
                            <SelectValue placeholder="Выберите филиал" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Общий склад</SelectItem>
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
                    Отмена
                  </Button>
                  <Button type="submit" disabled={addInventoryMutation.isPending} data-testid="button-save-inventory">
                    {addInventoryMutation.isPending ? "Сохранение..." : "Сохранить"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Alert className="mb-6 border-yellow-200 bg-yellow-50" data-testid="low-stock-alert">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <span className="font-medium">Внимание!</span> У вас {lowStockItems.length} материалов с низким остатком.
            <Button variant="link" className="p-0 h-auto ml-1 text-yellow-800 underline" data-testid="button-view-low-stock">
              Посмотреть список
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <Card data-testid="stats-total-items">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Всего материалов</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-items">
                  {inventory.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stats-low-stock">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Низкий остаток</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-low-stock-count">
                  {lowStockItems.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stats-out-of-stock">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Закончилось</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-out-of-stock-count">
                  {inventory.filter(item => item.quantity === 0).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stats-in-stock">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">В наличии</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-in-stock-count">
                  {inventory.filter(item => item.quantity > item.minQuantity).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-success" />
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
                placeholder="Поиск материалов..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-inventory"
              />
            </div>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Все филиалы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все филиалы</SelectItem>
                <SelectItem value="">Общий склад</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Количество</TableHead>
                  <TableHead>Минимум</TableHead>
                  <TableHead>Филиал</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.length === 0 ? (
                  <TableRow data-testid="no-inventory-row">
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? "Материалы не найдены" : "Нет добавленных материалов"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInventory.map((item) => {
                    const stockStatus = getStockStatus(item);
                    return (
                      <TableRow key={item.id} className="table-row" data-testid={`inventory-row-${item.id}`}>
                        <TableCell>
                          <div className="font-medium" data-testid={`text-inventory-name-${item.id}`}>
                            {item.name}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-inventory-quantity-${item.id}`}>
                          <span className={`font-medium ${stockStatus === "out" ? "text-destructive" : stockStatus === "low" ? "text-yellow-600" : ""}`}>
                            {item.quantity} {item.unit}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground" data-testid={`text-inventory-min-quantity-${item.id}`}>
                          {item.minQuantity} {item.unit}
                        </TableCell>
                        <TableCell data-testid={`text-inventory-branch-${item.id}`}>
                          {getBranchName(item.branchId)}
                        </TableCell>
                        <TableCell data-testid={`badge-inventory-status-${item.id}`}>
                          {getStockStatusBadge(stockStatus)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Button variant="ghost" size="icon" data-testid={`button-edit-inventory-${item.id}`}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(item.id)}
                              disabled={deleteInventoryMutation.isPending}
                              data-testid={`button-delete-inventory-${item.id}`}
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

          {filteredInventory.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                Показано {filteredInventory.length} из {inventory.length} материалов
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
