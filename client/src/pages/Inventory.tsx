import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, CheckCircle, Download, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import * as xlsx from "xlsx";

const unitOptions = [
  "шт",
  "мл",
  "л",
  "г",
  "кг",
  "упаковка",
  "тюбик",
  "флакон"
] as const;

const categoryOptions = ["Расходники", "Косметика", "Инструменты", "Хоз. товары", "Прочее"];
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

export default function Inventory() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);
  const { toast } = useToast();

  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importData, setImportData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

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
      unit: unitOptions[0],
      category: categoryOptions[0],
      minQuantity: 0,
      branchId: "general",
      costPrice: "0",
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
        title: t("inventory_added_title") || "Материал добавлен",
        description: t("inventory_added_desc") || "Новый материал успешно добавлен на склад",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message || t("inventory_add_failed") || "Не удалось добавить материал",
      });
    },
  });

  const deleteInventoryMutation = useMutation({
    mutationFn: async (id: string) => {
      await authenticatedApiRequest("DELETE", `/api/inventory/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setIsDeleteDialogOpen(false);
      setSelectedInventoryId(null);
      toast({
        title: "Материал удален",
        description: "Материал успешно удален со склада",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message || t("inventory_delete_failed") || "Не удалось удалить материал",
      });
    },
  });

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    // Фильтрация
    const matchesBranch =
      selectedBranch === "all" ||
      (selectedBranch === "general" && !item.branchId) ||
      item.branchId === selectedBranch;
    const matchesCategory =
      selectedCategory === "all" ||
      item.category === selectedCategory ||
      (!item.category && selectedCategory === "general");

    return matchesSearch && matchesBranch && matchesCategory;
  });

  const lowStockItems = inventory.filter(item => item.quantity <= (item.minQuantity || 0));

  // Chart data
  const chartData = categoryOptions.map(cat => ({
    name: cat,
    value: inventory.filter(i => (i.category || "general") === cat).reduce((sum, item) => sum + item.quantity, 0)
  })).filter(d => d.value > 0);
  if (chartData.length === 0 && inventory.length > 0) {
    chartData.push({ name: "Все материалы", value: inventory.reduce((sum, item) => sum + item.quantity, 0) });
  }

  const handleExport = async () => {
    try {
      const response = await authenticatedApiRequest("GET", "/api/inventory/export");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "inventory.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: t("error") || "Ошибка",
        description: e.message || "Не удалось скачать файл",
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result as string;
      const wb = xlsx.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
      if (data.length > 0) {
        setImportHeaders(data[0] as string[]);
        setImportData(xlsx.utils.sheet_to_json(ws));
        // Auto-map if possible
        const headers = data[0] as string[];
        const newMapping: Record<string, string> = {};
        const findHeader = (keywords: string[]) => headers.find(h => keywords.some(k => typeof h === 'string' && h.toLowerCase().includes(k)));

        newMapping.name = findHeader(["название", "имя", "наименование", "товар", "name"]) || "";
        newMapping.quantity = findHeader(["кол", "остаток", "штук", "quantity", "qty"]) || "";
        newMapping.minQuantity = findHeader(["мин", "min"]) || "";
        newMapping.unit = findHeader(["ед", "изм", "unit"]) || "";
        newMapping.category = findHeader(["кат", "групп", "category"]) || "";

        setMapping(newMapping);
        setIsImportOpen(true);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // reset
  };

  const handleImportSubmit = async () => {
    setIsImporting(true);
    let successCount = 0;
    for (const row of importData) {
      if (!row[mapping.name]) continue; // Skip if no name
      try {
        await addInventoryMutation.mutateAsync({
          name: String(row[mapping.name]),
          quantity: Number(row[mapping.quantity]) || 0,
          unit: (unitOptions.includes(row[mapping.unit]) ? row[mapping.unit] : "шт") as any,
          category: categoryOptions.includes(row[mapping.category]) ? row[mapping.category] : categoryOptions[0],
          minQuantity: Number(row[mapping.minQuantity]) || 0,
          branchId: "general", // import to general stock by default
          costPrice: "0",
        });
        successCount++;
      } catch (e) {
        console.error("Import error on row:", row, e);
      }
    }
    setIsImporting(false);
    setIsImportOpen(false);
    toast({ title: "Импорт завершен", description: `Успешно добавлено материалов: ${successCount}` });
  };

  const onSubmit = (data: InsertInventory) => {
    const payload: any = {
      ...data,
      branchId: data.branchId === "general" ? undefined : data.branchId,
    };
    addInventoryMutation.mutate(payload);
  };

  const handleDelete = (id: string) => {
    setSelectedInventoryId(id);
    setIsDeleteDialogOpen(true);
  };

  // Отображение имени филиала
  const getBranchName = (branchId: string | null | undefined) => {
    if (!branchId) return t("general_stock");
    if (branchId === "general") return t("general_stock");
    const branch = branches.find((b) => b.id === branchId);
    return branch?.name || t("unknown_branch");
  };


  const getStockStatus = (item: Inventory) => {
    if (item.quantity === 0) return "out";
    if (item.quantity <= (item.minQuantity || 0)) return "low";
    return "good";
  };

  const getStockStatusBadge = (status: string) => {
    switch (status) {
      case "out":
        return <Badge variant="destructive" className="text-xs">{t("out_of_stock")}</Badge>;
      case "low":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">{t("low_stock")}</Badge>;
      case "good":
        return <Badge variant="default" className="bg-success text-success-foreground text-xs">{t("in_stock")}</Badge>;
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold">{t("title_inventory")}</h2>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
          <div className="relative">
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Импорт
            </Button>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-inventory">
                <Plus className="h-4 w-4 mr-2" />
                {t("add_material")}
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-add-inventory" aria-describedby="add-inventory-desc">
              <DialogHeader>
                <DialogTitle>{t("add_new_material")}</DialogTitle>
              </DialogHeader>
              <p id="add-inventory-desc" className="text-sm text-muted-foreground">{t("add_new_material")}</p>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("mat_name")}</FormLabel>
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
                          <FormLabel>{t("quantity")}</FormLabel>
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
                          <FormLabel>{t("unit")}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-inventory-unit">
                                <SelectValue placeholder={t("choose_unit")} />
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
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Категория</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || categoryOptions[0]}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите категорию" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categoryOptions.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="minQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("min_quantity")}</FormLabel>
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
                        <FormLabel>{t("branch")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-inventory-branch">
                              <SelectValue placeholder={t("choose_branch")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="general">{t("general_stock")}</SelectItem>
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
                    <Button type="submit" disabled={addInventoryMutation.isPending} data-testid="button-save-inventory">
                      {addInventoryMutation.isPending ? "Сохранение..." : t("save")}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("are_you_sure")}</DialogTitle>
              <DialogDescription>
                {t("are_you_sure_delete_inventory_desc")}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} data-testid="button-cancel-delete">
                {t("cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteInventoryMutation.mutate(selectedInventoryId!)}
                disabled={deleteInventoryMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {deleteInventoryMutation.isPending ? t("deleting") : t("delete")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Smart Import Modal */}
        <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Импорт материалов (Smart Mapper)</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Мы нашли {importData.length} строк в файле. Сопоставьте колонки из вашего файла с полями нашей базы.</p>

              <div className="grid grid-cols-2 gap-4 border-b pb-2 font-medium">
                <div>Поле в CRM</div>
                <div>Колонка из файла</div>
              </div>

              {[
                { id: "name", label: "Название (обязательно)*" },
                { id: "category", label: "Категория" },
                { id: "quantity", label: "Количество (на складе)" },
                { id: "minQuantity", label: "Мин. остаток" },
                { id: "unit", label: "Ед. изм." },
              ].map(field => (
                <div key={field.id} className="grid grid-cols-2 gap-4 items-center">
                  <div className="text-sm">{field.label}</div>
                  <Select
                    value={mapping[field.id]}
                    onValueChange={(val) => setMapping(prev => ({ ...prev, [field.id]: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Не выбрано" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{"-- Пропустить --"}</SelectItem>
                      {importHeaders.map((header, idx) => (
                        <SelectItem key={idx} value={header || `empty-${idx}`}>
                          {header || `Колонка ${idx + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}

              <div className="pt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsImportOpen(false)} disabled={isImporting}>
                  Отмена
                </Button>
                <Button onClick={handleImportSubmit} disabled={isImporting || !mapping.name}>
                  {isImporting ? "Импорт..." : "Начать импорт"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
                  <p className="text-sm text-muted-foreground">{t("total_items")}</p>
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
                  <p className="text-sm text-muted-foreground">{t("low_stock")}</p>
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
                  <p className="text-sm text-muted-foreground">{t("out_of_stock")}</p>
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
                  <p className="text-sm text-muted-foreground">{t("in_stock")}</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-in-stock-count">
                    {inventory.filter(item => item.quantity > (item.minQuantity || 0)).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Visual Chart */}
        {inventory.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Количество материалов по категориям</h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("search_inventory_placeholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-inventory"
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Все категории" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все категории</SelectItem>
                    {categoryOptions.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t("all_branches")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("all_branches")}</SelectItem>
                    <SelectItem value="general">{t("general_stock")}</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("mat_name")}</TableHead>
                    <TableHead>{t("quantity")}</TableHead>
                    <TableHead>{t("min_quantity")}</TableHead>
                    <TableHead>{t("branch")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.length === 0 ? (
                    <TableRow data-testid="no-inventory-row">
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? t("inventory_not_found") : t("no_inventory")}
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
                  {filteredInventory.length} / {inventory.length}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
