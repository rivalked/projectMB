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
import { format, parseISO, startOfDay, endOfDay, addDays, subDays, setHours, setMinutes } from "date-fns";
import { ru } from "date-fns/locale";
import { useI18n } from "@/lib/i18n";
import { motion, type PanInfo } from "framer-motion";

export default function Appointments() {
  const { t } = useI18n();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
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

  const updateAppointmentTimeMutation = useMutation({
    mutationFn: async ({ id, newDate }: { id: string, newDate: Date }) => {
      const response = await authenticatedApiRequest("PUT", `/api/appointments/${id}`, {
        appointmentDate: newDate.toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Время обновлено",
        description: "Время записи было успешно изменено",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось обновить время записи",
      });
    }
  });

  const handleDragEnd = (appointment: Appointment, info: PanInfo) => {
    const aptDate = parseISO(appointment.appointmentDate.toString());
    const originalHours = aptDate.getHours();
    const originalMinutes = aptDate.getMinutes();

    // Timeline starts at 9:00, 1 hour = 60px
    const originalTop = (originalHours - 9) * 60 + originalMinutes;
    const newTop = originalTop + info.offset.y;

    // Calculate new time (snap to 15 min intervals is nice, but we'll do raw minutes for now or snap to 30)
    let newTotalMinutes = Math.max(0, Math.round(newTop));
    // Snap to nearest 15 minutes (15px)
    newTotalMinutes = Math.round(newTotalMinutes / 15) * 15;

    const newHours = Math.floor(newTotalMinutes / 60) + 9;
    const newMins = newTotalMinutes % 60;

    if (newHours >= 9 && newHours <= 20) {
      const newDate = setMinutes(setHours(aptDate, newHours), newMins);
      // Only mutate if time changed
      if (newHours !== originalHours || newMins !== originalMinutes) {
        updateAppointmentTimeMutation.mutate({ id: appointment.id, newDate });
      }
    }
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
      const dateMatch = aptDate >= start && aptDate <= end;
      const branchMatch = branchFilter === "all" || apt.branchId === branchFilter;
      const employeeMatch = employeeFilter === "all" || apt.employeeId === employeeFilter;
      return dateMatch && branchMatch && employeeMatch;
    }).sort((a, b) => {
      const dateA = parseISO(a.appointmentDate.toString());
      const dateB = parseISO(b.appointmentDate.toString());
      return dateA.getTime() - dateB.getTime();
    });
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat("uz-UZ", {
      style: "currency",
      currency: "UZS",
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
        <h2 className="text-2xl font-bold">{t("title_appointments")}</h2>
        <div className="flex items-center space-x-4">
          <Select value={branchFilter} onValueChange={setBranchFilter} disabled={isLoading} data-testid="select-branch-filter">
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t("all_branches_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все филиалы</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={employeeFilter} onValueChange={setEmployeeFilter} disabled={isLoading} data-testid="select-employee-filter">
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t("all_masters_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все мастера</SelectItem>
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
                {t("new_appointment")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md" data-testid="dialog-add-appointment">
              <DialogHeader>
                <DialogTitle>{t("new_appointment")}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("client")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-appointment-client">
                              <SelectValue placeholder={t("choose_client")} />
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
                        <FormLabel>{t("service")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-appointment-service">
                              <SelectValue placeholder={t("choose_service")} />
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
                        <FormLabel>{t("master")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-appointment-employee">
                              <SelectValue placeholder={t("choose_master")} />
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
                        <FormLabel>{t("branch")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-appointment-branch">
                              <SelectValue placeholder={t("choose_branch")} />
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
                        <FormLabel>{t("date_time")}</FormLabel>
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
                {t("view_day")}
              </Button>
              <Button
                variant={viewMode === "week" ? "default" : "outline"}
                onClick={() => setViewMode("week")}
                data-testid="button-view-week"
              >
                {t("view_week")}
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
                  <h4 className="font-medium">{t("schedule_for_day")}</h4>
                </div>
                <div className="p-4 pl-16 relative overflow-y-auto h-[600px] w-full" style={{ scrollbarWidth: 'thin' }}>
                  {/* Timeline grid (9:00 to 20:00) */}
                  <div className="absolute inset-0 pl-16 pt-4 pointer-events-none">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="relative w-full border-t border-border/40 h-[60px]">
                        <span className="absolute -left-14 -top-3 text-xs text-muted-foreground font-medium w-10 text-right">
                          {i + 9}:00
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Appointments */}
                  <div className="relative w-full h-[720px] pt-4">
                    {dayAppointments.length === 0 ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground" data-testid="no-appointments">
                        <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p>{t("no_appointments_date")}</p>
                      </div>
                    ) : (
                      dayAppointments.map((appointment) => {
                        const aptDate = parseISO(appointment.appointmentDate.toString());
                        const hours = aptDate.getHours();
                        const minutes = aptDate.getMinutes();
                        // Bound between 9 and 20
                        const safeHours = Math.max(9, Math.min(20, hours));
                        const topOffset = (safeHours - 9) * 60 + minutes;

                        return (
                          <motion.div
                            key={appointment.id}
                            drag="y"
                            dragConstraints={{ top: 0, bottom: 11 * 60 }}
                            dragMomentum={false}
                            onDragEnd={(_, info) => handleDragEnd(appointment, info)}
                            className="absolute left-2 right-4 bg-card/90 backdrop-blur-md border border-primary/20 shadow-sm rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors z-10"
                            style={{ top: topOffset, minHeight: '55px' }}
                            data-testid={`appointment-item-${appointment.id}`}
                            whileHover={{ scale: 1.01, zIndex: 20 }}
                            whileDrag={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)", zIndex: 50, opacity: 0.9 }}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="font-semibold text-sm h-5" style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                  {getClientName(appointment.clientId)}
                                </h5>
                                <p className="text-xs text-muted-foreground flex items-center mt-1">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {format(aptDate, "HH:mm")} • {getEmployeeName(appointment.employeeId)}
                                </p>
                              </div>
                              <div className="text-right">
                                <Badge
                                  variant={appointment.status === "completed" ? "default" : "secondary"}
                                  className={`text-[10px] py-0 h-4 ${appointment.status === "completed" ? "bg-success text-success-foreground" : ""}`}
                                >
                                  {appointment.status === "scheduled" ? "План" :
                                    appointment.status === "completed" ? "Успешно" : "Отмена"}
                                </Badge>
                                <p className="text-xs font-medium text-primary mt-1">
                                  {getServiceName(appointment.serviceId)}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3">{t("quick_actions")}</h4>
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => setIsAddDialogOpen(true)}
                      data-testid="button-quick-add-appointment"
                    >
                      <Plus className="h-4 w-4 mr-2 text-primary" />
                      {t("add_appointment")}
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" data-testid="button-quick-view-week">
                      <CalendarIcon className="h-4 w-4 mr-2 text-accent" />
                      {t("see_week")}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3">{t("day_stats")}</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t("total_appointments_label")}</span>
                      <span className="text-sm font-medium" data-testid="text-stats-total-appointments">
                        {dayAppointments.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t("completed_label")}</span>
                      <span className="text-sm font-medium text-success" data-testid="text-stats-completed-appointments">
                        {dayAppointments.filter(apt => apt.status === "completed").length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t("scheduled_label")}</span>
                      <span className="text-sm font-medium text-primary" data-testid="text-stats-scheduled-appointments">
                        {dayAppointments.filter(apt => apt.status === "scheduled").length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t("revenue_label")}</span>
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
