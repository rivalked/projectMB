import { useQuery } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, Calendar, DollarSign, TrendingUp, Clock } from "lucide-react";

const mockChartData = [
  { name: "Пн", revenue: 45000 },
  { name: "Вт", revenue: 52000 },
  { name: "Ср", revenue: 48000 },
  { name: "Чт", revenue: 61000 },
  { name: "Пт", revenue: 55000 },
  { name: "Сб", revenue: 67000 },
  { name: "Вс", revenue: 58000 },
];

interface DashboardStats {
  totalClients: number;
  todayAppointments: number;
  weeklyRevenue: number;
  staffUtilization: number;
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/dashboard/stats");
      return response.json();
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="p-6" data-testid="dashboard-loading">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-24 mb-2"></div>
              <div className="h-8 bg-muted rounded w-16 mb-4"></div>
              <div className="h-3 bg-muted rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="dashboard-page">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card data-testid="stats-total-clients">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Всего клиентов</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-clients">
                  {stats?.totalClients.toLocaleString() || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-success">+12%</span>
              <span className="text-muted-foreground ml-1">за неделю</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stats-today-appointments">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Записи сегодня</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-today-appointments">
                  {stats?.todayAppointments || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-accent" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-success">+8%</span>
              <span className="text-muted-foreground ml-1">от среднего</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stats-weekly-revenue">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Выручка за неделю</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-weekly-revenue">
                  {stats ? formatCurrency(stats.weeklyRevenue) : "₽0"}
                </p>
              </div>
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-success" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-success">+15%</span>
              <span className="text-muted-foreground ml-1">от прошлой недели</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stats-staff-utilization">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Загруженность</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-staff-utilization">
                  {stats?.staffUtilization || 0}%
                </p>
              </div>
              <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-destructive" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-muted-foreground">Средняя загрузка</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="revenue-chart">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Динамика дохода</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(Number(value)), "Выручка"]}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="upcoming-appointments">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Ближайшие записи</h3>
              <Button variant="outline" size="sm" data-testid="button-view-all-appointments">
                Все записи
              </Button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-3 hover:bg-muted/50 rounded-lg transition-colors" data-testid="appointment-item-1">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Следующая запись</p>
                  <p className="text-sm text-muted-foreground">
                    Нет записей на сегодня
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
