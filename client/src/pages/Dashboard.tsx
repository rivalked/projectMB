import { useQuery } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Users, Calendar, DollarSign, Activity, UserCheck, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--destructive))", "hsl(var(--success))"];

interface DashboardStats {
  totalClients: number;
  todayAppointments: number;
  weeklyRevenue: number;
  staffUtilization: number;
  averageCheck?: number;
  retentionRate?: number;
  revenueData?: { name: string; revenue: number }[];
  servicePopularityData?: { name: string; value: number }[];
  employeePerformanceData?: { name: string; value: number }[];
  upcomingAppointments?: { id: number; clientName: string; service: string; employee: string; time: string }[];
}

export default function Dashboard() {
  const { t } = useI18n();
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/dashboard/stats");
      return response.json();
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("uz-UZ", {
      style: "currency",
      currency: "UZS",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8" data-testid="dashboard-loading">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-6 animate-pulse h-32"></div>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="lg:col-span-4 bg-card border rounded-xl h-[400px] animate-pulse"></div>
          <div className="lg:col-span-3 bg-card border rounded-xl h-[400px] animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Provide realistic mocks if backend doesn't send these yet
  const displayRevenue = stats?.weeklyRevenue || 0;
  const displayAppointments = stats?.todayAppointments || 0;
  const displayAvgCheck = stats?.averageCheck || 0;
  const displayRetention = stats?.retentionRate || 0;

  const revenueData = stats?.revenueData || [];
  const servicePopularityData = stats?.servicePopularityData || [];
  const employeePerformanceData = stats?.employeePerformanceData || [];
  const upcomingAppointments = stats?.upcomingAppointments || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8" data-testid="dashboard-page">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Button>Скачать отчет</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общая выручка</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(displayRevenue)}</div>
            <p className="text-xs text-success mt-1 flex items-center">
              <Activity className="h-3 w-3 mr-1" /> +20.1% с прошлого месяца
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Записи</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{displayAppointments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +19% с прошлой недели
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Средний чек</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(displayAvgCheck)}</div>
            <p className="text-xs text-success mt-1 flex items-center">
              <Activity className="h-3 w-3 mr-1" /> +7% с прошлого месяца
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Удержание клиентов</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayRetention}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              +2% новых постоянных клиентов
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bento Grid layout */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">

        {/* Revenue Dynamics Chart */}
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader>
            <CardTitle>Динамика выручки</CardTitle>
            <CardDescription>Выручка по дням за последнюю неделю</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)' }}
                    formatter={(value: number) => [formatCurrency(value), "Выручка"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle>Ближайшие записи</CardTitle>
            <CardDescription>Вы сегодня запланировали {displayAppointments} встреч.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {upcomingAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет запланированных записей</p>
              ) : upcomingAppointments.map((appt) => (
                <div key={appt.id} className="flex items-center">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{getInitials(appt.clientName)}</AvatarFallback>
                  </Avatar>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{appt.clientName}</p>
                    <p className="text-sm text-muted-foreground">
                      Мастер: {appt.employee}
                    </p>
                  </div>
                  <div className="ml-auto flex flex-col items-end space-y-1">
                    <p className="text-sm font-medium">{appt.time}</p>
                    <Badge variant="secondary" className="font-normal">{appt.service}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Service Popularity */}
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle>Популярные услуги</CardTitle>
            <CardDescription>Какие услуги приносят больше всего дохода</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={servicePopularityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {servicePopularityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} записей`, "Количество"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 flex-wrap text-sm text-muted-foreground mt-4">
              {servicePopularityData.map((s, i) => (
                <div key={s.name} className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                  {s.name}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Employee Performance */}
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader>
            <CardTitle>Эффективность сотрудников</CardTitle>
            <CardDescription>Количество оказанных услуг (за месяц)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={employeePerformanceData} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" />
                  <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)' }}
                    formatter={(value: number) => [value, "Услуг оказано"]}
                  />
                  <Bar dataKey="value" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
