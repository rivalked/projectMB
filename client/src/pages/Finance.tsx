import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { type Payment, type Client, type Appointment, type Service, type Branch } from "@shared/schema";
import { CalendarIcon, Filter, Download, DollarSign, TrendingUp, CreditCard } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { ru } from "date-fns/locale";
import { useI18n } from "@/lib/i18n";

const paymentMethodColors = {
  cash: "#10b981",
  card: "#3b82f6", 
  online: "#8b5cf6"
};

export default function Finance() {
  const { t, lang } = useI18n();
  const [dateRange, setDateRange] = useState<"week" | "month">("month");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");

  const { data: payments = [], isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/payments");
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

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/appointments");
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

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || "Неизвестный клиент";
  };

  const getServiceName = (appointmentId: string | null) => {
    if (!appointmentId) return "Прочее";
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) return "Прочее";
    const service = services.find(s => s.id === appointment.serviceId);
    return service?.name || "Прочее";
  };

  const getBranchName = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || "Неизвестный филиал";
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
    }).format(typeof amount === "string" ? parseFloat(amount) : amount);
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "cash": return lang === 'uz' ? t("uz_cash") : t("cash");
      case "card": return lang === 'uz' ? t("uz_card") : t("card");
      case "online": return lang === 'uz' ? t("uz_online") : t("online");
      default: return method;
    }
  };

  const filteredPayments = payments.filter(payment => {
    if (paymentMethodFilter !== "all" && payment.paymentMethod !== paymentMethodFilter) {
      return false;
    }
    return true;
  }).sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt) : new Date();
    const dateB = b.createdAt ? new Date(b.createdAt) : new Date();
    return dateB.getTime() - dateA.getTime();
  });

  // Calculate statistics
  const totalRevenue = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
  const todayPayments = payments.filter(payment => {
    const paymentDate = payment.createdAt ? new Date(payment.createdAt) : new Date();
    const today = new Date();
    return paymentDate.toDateString() === today.toDateString();
  });
  const todayRevenue = todayPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

  // Payment method distribution
  const paymentMethodStats = payments.reduce((acc, payment) => {
    const method = payment.paymentMethod;
    if (!acc[method]) {
      acc[method] = { count: 0, amount: 0 };
    }
    acc[method].count++;
    acc[method].amount += parseFloat(payment.amount);
    return acc;
  }, {} as Record<string, { count: number; amount: number }>);

  const pieChartData = Object.entries(paymentMethodStats).map(([method, stats]) => ({
    name: getPaymentMethodLabel(method),
    value: stats.amount,
    count: stats.count,
    color: paymentMethodColors[method as keyof typeof paymentMethodColors] || "#64748b"
  }));

  // Weekly revenue chart data (mock data for demonstration)
  const revenueChartData = [
    { name: "Пн", revenue: Math.floor(Math.random() * 50000) + 30000 },
    { name: "Вт", revenue: Math.floor(Math.random() * 50000) + 30000 },
    { name: "Ср", revenue: Math.floor(Math.random() * 50000) + 30000 },
    { name: "Чт", revenue: Math.floor(Math.random() * 50000) + 30000 },
    { name: "Пт", revenue: Math.floor(Math.random() * 50000) + 30000 },
    { name: "Сб", revenue: Math.floor(Math.random() * 50000) + 30000 },
    { name: "Вс", revenue: Math.floor(Math.random() * 50000) + 30000 },
  ];

  if (paymentsLoading) {
    return (
      <div className="p-6" data-testid="finance-loading">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="finance-page">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t("title_finance")}</h2>
        <div className="flex items-center space-x-4">
          <Select value={dateRange} onValueChange={(value: "week" | "month") => setDateRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{t("week")}</SelectItem>
              <SelectItem value="month">{t("month")}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" data-testid="button-export-report">
            <Download className="h-4 w-4 mr-2" />
            {t("export")}
          </Button>
        </div>
      </div>

      {/* Revenue Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card data-testid="stats-total-revenue">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("overall_revenue")}</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-revenue">
                  {formatCurrency(totalRevenue)}
                </p>
              </div>
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-success" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-success">+15%</span>
              <span className="text-muted-foreground ml-1">{t("month")}</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stats-today-revenue">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("today_revenue")}</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-today-revenue">
                  {formatCurrency(todayRevenue)}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-success">+8%</span>
              <span className="text-muted-foreground ml-1">{t("from_average")}</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stats-payments-count">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("payments_count")}</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-payments-count">
                  {payments.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-accent" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-muted-foreground">{t("total_operations")}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card data-testid="revenue-chart">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t("revenue_dynamics")}</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(Number(value)), t("weekly_revenue")]}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="payment-methods-chart">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t("payment_methods")}</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [formatCurrency(Number(value)), name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center space-x-4 mt-4">
              {pieChartData.map((entry, index) => (
                <div key={index} className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-muted-foreground">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{t("payments_history")}</h3>
            <div className="flex items-center space-x-4">
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t("payment_method")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("all_methods")}</SelectItem>
                  <SelectItem value="cash">{getPaymentMethodLabel("cash")}</SelectItem>
                  <SelectItem value="card">{getPaymentMethodLabel("card")}</SelectItem>
                  <SelectItem value="online">{getPaymentMethodLabel("online")}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                {t("filters")}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("client_col")}</TableHead>
                  <TableHead>{t("service_col")}</TableHead>
                  <TableHead>{t("payment_method")}</TableHead>
                  <TableHead>{t("amount")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow data-testid="no-payments-row">
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t("no_payments")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.id} className="table-row" data-testid={`payment-row-${payment.id}`}>
                      <TableCell data-testid={`text-payment-date-${payment.id}`}>
                        {format(payment.createdAt ? new Date(payment.createdAt) : new Date(), "dd.MM.yyyy HH:mm", { locale: ru })}
                      </TableCell>
                      <TableCell data-testid={`text-payment-client-${payment.id}`}>
                        {getClientName(payment.clientId)}
                      </TableCell>
                      <TableCell data-testid={`text-payment-service-${payment.id}`}>
                        {getServiceName(payment.appointmentId)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary"
                          className="text-xs"
                          data-testid={`badge-payment-method-${payment.id}`}
                        >
                          {getPaymentMethodLabel(payment.paymentMethod)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-payment-amount-${payment.id}`}>
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={payment.status === "completed" ? "default" : "secondary"}
                          className={payment.status === "completed" ? "bg-success text-success-foreground" : ""}
                          data-testid={`badge-payment-status-${payment.id}`}
                        >
                          {payment.status === "completed" ? t("completed") : t("processing")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredPayments.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                {filteredPayments.length} / {payments.length}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
