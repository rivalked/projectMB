import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/ui/badge";
import { 
  insertAppointmentSchema, 
  type Appointment, 
  type InsertAppointment,
  type Client,
  type Employee,
  type Service,
  type Branch
} from "@shared/schema";
import { Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, User, Scissors } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, startOfDay, endOfDay, addDays, subDays } from "date-fns";
import { ru } from "date-fns/locale";

export default function Appointments() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/appointments");
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

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/employees");
      return response.json();
    },
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/services");
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

  const form = useForm<InsertAppointment>({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      clientId: "",
      employeeId: "",
      serviceId: "",
      branchId: "",
      appointmentDate: new Date(),
      status: "scheduled",
      notes: "",
    },
  });

  const addAppointmentMutation = useMutation({
    mutationFn: async (data: InsertAppointment) => {
      const response = await authenticatedApiRequest("POST", "/api/appointments", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "Запись добавлена",
        description: "Новая запись успешно добавлена в календарь",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось добавить запись",
      });
    },
  });

  const onSubmit = (data: InsertAppointment) => {
    addAppointmentMutation.mutate(data);
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || "Неизвестный клиент";
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee?.name || "Неизвестный сотрудник";
  };

  const getServiceName = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service?.name || "Неизвестная услуга";
  };

  const getServicePrice = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service?.price || "0";
  };

  const getBranchName = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || "Неизвестный филиал";
  };

  const getDayAppointments = () => {
    const start = startOfDay(selectedDate);
    const end = endOfDay(selectedDate);
    
    return appointments.filter(apt => {
      const aptDate = parseISO(apt.appointmentDate.toString());
      return aptDate >= start && aptDate <= end;
    }).sort((a, b) => {
      const dateA = parseISO(a.appointmentDate.toString());
      const dateB = parseISO(b.appointmentDate.toString());
      return dateA.getTime() - dateB.getTime();
    });
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
    }).format(parseFloat(price));
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedDate(subDays(selectedDate, 1));
    } else {
      setSelectedDate(addDays(selectedDate, 1));
    }
  };

  const dayAppointments = getDayAppointments();

  if (isLoading) {
    return (
      <div className="p-6" data-testid="appointments-loading">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-6"></div>
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="appointments-page">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Календарь записей</h2>
        <div className="flex items-center space-x-4">
          <Select value={branches[0]?.id || ""}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Все филиалы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Все филиалы</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value="">
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Все мастера" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Все мастера</SelectItem>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-appointment">
                <Plus className="h-4 w-4 mr-2" />
                Новая запись
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md" data-testid="dialog-add-appointment">
              <DialogHeader>
                <DialogTitle>Добавить новую запись</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Клиент</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-appointment-client">
                              <SelectValue placeholder="Выберите клиента" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
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
                    name="serviceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Услуга</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-appointment-service">
                              <SelectValue placeholder="Выберите услугу" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {services.map((service) => (
                              <SelectItem key={service.id} value={service.id}>
                                {service.name} - {formatPrice(service.price)}
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
                    name="employeeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Мастер</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-appointment-employee">
                              <SelectValue placeholder="Выберите мастера" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {employees.map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.name}
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
                    name="branchId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Филиал</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-appointment-branch">
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
                  <FormField
                    control={form.control}
                    name="appointmentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Дата и время</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                            value={field.value ? format(new Date(field.value), "yyyy-MM-dd'T'HH:mm") : ""}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                            data-testid="input-appointment-datetime"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Отмена
                    </Button>
                    <Button type="submit" disabled={addAppointmentMutation.isPending} data-testid="button-save-appointment">
                      {addAppointmentMutation.isPending ? "Сохранение..." : "Сохранить"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button
                variant={viewMode === "day" ? "default" : "outline"}
                onClick={() => setViewMode("day")}
                data-testid="button-view-day"
              >
                День
              </Button>
              <Button
                variant={viewMode === "week" ? "default" : "outline"}
                onClick={() => setViewMode("week")}
                data-testid="button-view-week"
              >
                Неделя
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="icon" onClick={() => navigateDate('prev')} data-testid="button-prev-day">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-lg font-semibold min-w-[200px] text-center" data-testid="text-selected-date">
                {format(selectedDate, "d MMMM yyyy, EEEE", { locale: ru })}
              </h3>
              <Button variant="outline" size="icon" onClick={() => navigateDate('next')} data-testid="button-next-day">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Schedule */}
            <div className="lg:col-span-2">
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-muted p-4 border-b border-border">
                  <h4 className="font-medium">Расписание на день</h4>
                </div>
                <div className="p-4">
                  {dayAppointments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground" data-testid="no-appointments">
                      <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p>Нет записей на выбранную дату</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dayAppointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          className="flex items-center space-x-4 p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                          data-testid={`appointment-item-${appointment.id}`}
                        >
                          <div className="w-16 text-center">
                            <span className="text-sm font-medium" data-testid={`text-appointment-time-${appointment.id}`}>
                              {format(parseISO(appointment.appointmentDate.toString()), "HH:mm")}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm" data-testid={`text-appointment-client-${appointment.id}`}>
                              {getClientName(appointment.clientId)}
                            </p>
                            <p className="text-sm text-muted-foreground" data-testid={`text-appointment-service-${appointment.id}`}>
                              {getServiceName(appointment.serviceId)}
                            </p>
                          </div>
                          <div className="text-sm text-muted-foreground" data-testid={`text-appointment-employee-${appointment.id}`}>
                            {getEmployeeName(appointment.employeeId)}
                          </div>
                          <div className="text-sm font-medium" data-testid={`text-appointment-price-${appointment.id}`}>
                            {formatPrice(getServicePrice(appointment.serviceId))}
                          </div>
                          <Badge
                            variant={appointment.status === "completed" ? "default" : "secondary"}
                            className={appointment.status === "completed" ? "bg-success text-success-foreground" : ""}
                            data-testid={`badge-appointment-status-${appointment.id}`}
                          >
                            {appointment.status === "scheduled" ? "Запланировано" : 
                             appointment.status === "completed" ? "Выполнено" : "Отменено"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3">Быстрые действия</h4>
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => setIsAddDialogOpen(true)}
                      data-testid="button-quick-add-appointment"
                    >
                      <Plus className="h-4 w-4 mr-2 text-primary" />
                      Добавить запись
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" data-testid="button-quick-view-week">
                      <CalendarIcon className="h-4 w-4 mr-2 text-accent" />
                      Посмотреть неделю
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3">Статистика дня</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Всего записей</span>
                      <span className="text-sm font-medium" data-testid="text-stats-total-appointments">
                        {dayAppointments.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Выполнено</span>
                      <span className="text-sm font-medium text-success" data-testid="text-stats-completed-appointments">
                        {dayAppointments.filter(apt => apt.status === "completed").length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Предстоит</span>
                      <span className="text-sm font-medium text-primary" data-testid="text-stats-scheduled-appointments">
                        {dayAppointments.filter(apt => apt.status === "scheduled").length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Доход</span>
                      <span className="text-sm font-medium" data-testid="text-stats-day-revenue">
                        {formatPrice(
                          dayAppointments
                            .filter(apt => apt.status === "completed")
                            .reduce((sum, apt) => sum + parseFloat(getServicePrice(apt.serviceId)), 0)
                            .toString()
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
