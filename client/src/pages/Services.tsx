import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceSchema, type Service, type InsertService } from "@shared/schema";
import { Plus, Search, Edit, Trash2, Clock, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

const serviceCategories = [
  "Стрижки",
  "Окрашивание",
  "Маникюр",
  "Педикюр",
  "Уход за лицом",
  "Укладка",
  "Другое"
];

export default function Services() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/services");
      return response.json();
    },
  });

  const form = useForm<InsertService>({
    resolver: zodResolver(insertServiceSchema),
    defaultValues: {
      name: "",
      description: "",
      duration: 60,
      price: "0",
      category: "",
      isActive: true,
    },
  });

  const addServiceMutation = useMutation({
    mutationFn: async (data: InsertService) => {
      const response = await authenticatedApiRequest("POST", "/api/services", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "Услуга добавлена",
        description: "Новая услуга успешно добавлена в каталог",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось добавить услугу",
      });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      await authenticatedApiRequest("DELETE", `/api/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Услуга удалена",
        description: "Услуга успешно удалена из каталога",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось удалить услугу",
      });
    },
  });

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const onSubmit = (data: InsertService) => {
    addServiceMutation.mutate(data);
  };

  const handleDelete = (id: string) => {
    if (confirm("Вы уверены, что хотите удалить эту услугу?")) {
      deleteServiceMutation.mutate(id);
    }
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
    }).format(parseFloat(price));
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}ч ${mins > 0 ? `${mins}м` : ''}`;
    }
    return `${mins}м`;
  };

  if (isLoading) {
    return (
      <div className="p-6" data-testid="services-loading">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="h-64 bg-muted rounded-lg"></div>
            </div>
            <div className="lg:col-span-2">
              <div className="h-64 bg-muted rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="services-page">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t("title_services")}</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-service">
              <Plus className="h-4 w-4 mr-2" />
              {t("add_service")}
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-add-service">
            <DialogHeader>
              <DialogTitle>{t("add_service")}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("service_name")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Введите название услуги" data-testid="input-service-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("description")}</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value || ""} placeholder="Описание услуги" data-testid="input-service-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("duration_minutes")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            placeholder="60"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            data-testid="input-service-duration"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("price_rub")}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="2500" data-testid="input-service-price" />
                        </FormControl>
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
                      <FormLabel>{t("category")}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-service-category">
                          <SelectValue placeholder={t("category")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {serviceCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
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
                  <Button type="submit" disabled={addServiceMutation.isPending} data-testid="button-save-service">
                    {addServiceMutation.isPending ? "Сохранение..." : "Сохранить"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">{t("categories")}</h3>
              <div className="space-y-2">
                <Button
                  variant={selectedCategory === "all" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedCategory("all")}
                  data-testid="category-all"
                >
                  {t("all_services")}
                </Button>
                {serviceCategories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedCategory(category)}
                    data-testid={`category-${category.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Services List */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("search_services_placeholder")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-services"
                  />
                </div>
              </div>

              <div className="space-y-4">
                {filteredServices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground" data-testid="no-services">
                    {searchTerm || selectedCategory !== "all" 
                      ? t("services_not_found") 
                      : t("no_services")}
                  </div>
                ) : (
                  filteredServices.map((service) => (
                    <div
                      key={service.id}
                      className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      data-testid={`service-item-${service.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium" data-testid={`text-service-name-${service.id}`}>
                            {service.name}
                          </h4>
                          {service.description && (
                            <p className="text-sm text-muted-foreground mt-1" data-testid={`text-service-description-${service.id}`}>
                              {service.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-sm text-muted-foreground flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              <span data-testid={`text-service-duration-${service.id}`}>
                                {formatDuration(service.duration)}
                              </span>
                            </span>
                            <span className="text-sm font-medium text-primary flex items-center">
                              <DollarSign className="h-3 w-3 mr-1" />
                              <span data-testid={`text-service-price-${service.id}`}>
                                {formatPrice(service.price)}
                              </span>
                            </span>
                            <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                              {service.category}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="icon" data-testid={`button-edit-service-${service.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(service.id)}
                            disabled={deleteServiceMutation.isPending}
                            data-testid={`button-delete-service-${service.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
