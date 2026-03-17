import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { auth } from "@/lib/auth";
import { useLocation } from "wouter";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
    Building2,
    CreditCard,
    Users,
    MoreHorizontal,
    ShieldAlert,
    Bot,
    MessageSquare
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Tenant, Subscription, Addon, TenantAddon } from "@shared/schema";

export default function SuperAdminDashboard() {
    const { toast } = useToast();
    const [, setLocation] = useLocation();
    const user = auth.getUser();

    // Redirect if not super admin
    if (user && user.role !== "super_admin") {
        setLocation("/dashboard");
        return null;
    }

    // Queries
    const { data: tenants = [], isLoading: loadingTenants } = useQuery<Tenant[]>({
        queryKey: ["/api/super-admin/tenants"],
    });

    const { data: subscriptions = [] } = useQuery<Subscription[]>({
        queryKey: ["/api/super-admin/subscriptions"],
    });

    const { data: addons = [] } = useQuery<Addon[]>({
        queryKey: ["/api/super-admin/addons"],
    });

    // Example chart data based on tenants joined (mocking dates)
    const chartData = tenants.reduce((acc: any[], tenant) => {
        const d = new Date(tenant.createdAt || new Date()).toLocaleDateString("ru-RU", { month: "short", day: "numeric" });
        const existing = acc.find(x => x.name === d);
        if (existing) existing.total += 1;
        else acc.push({ name: d, total: 1 });
        return acc;
    }, []).reverse();

    // Mutations
    const updateTenantStatus = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            const res = await fetch(`/api/super-admin/tenants/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${auth.getToken()}`
                },
                body: JSON.stringify({ status })
            });
            if (!res.ok) throw new Error("Failed to update status");
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Статус обновлен" });
            queryClient.invalidateQueries({ queryKey: ["/api/super-admin/tenants"] });
        }
    });

    const updateTenantSubscription = useMutation({
        mutationFn: async ({ id, subscriptionId }: { id: string, subscriptionId: string | null }) => {
            const res = await fetch(`/api/super-admin/tenants/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${auth.getToken()}`
                },
                body: JSON.stringify({ subscriptionId })
            });
            if (!res.ok) throw new Error("Failed to update subscription");
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Подписка обновлена" });
            queryClient.invalidateQueries({ queryKey: ["/api/super-admin/tenants"] });
        }
    });

    const toggleTenantAddon = useMutation({
        mutationFn: async ({ tenantId, addonId, active }: { tenantId: string, addonId: string, active: boolean }) => {
            const res = await fetch(`/api/super-admin/tenants/${tenantId}/addons`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${auth.getToken()}`
                },
                body: JSON.stringify({ addonId, active })
            });
            if (!res.ok) throw new Error("Failed to toggle addon");
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Дополнение обновлено" });
            // In a real app we would have a query for this specific tenant's addons to invalidate
        }
    });

    const activeTenants = tenants.filter(t => t.status === "active").length;

    return (
        <div className="p-8 space-y-8 animate-in fade-in">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Super Admin Панель</h2>
                <p className="text-muted-foreground">Управление арендаторами и платформой.</p>
            </div>

            {/* Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Всего арендаторов</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{tenants.length}</div>
                        <p className="text-xs text-muted-foreground">
                            {activeTenants} активных
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Выручка (Оценка)</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {/* Mock logic for MRR */
                                tenants.filter(t => t.subscriptionId).length * 100000
                            } ₸
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Текущий MRR по активным подпискам
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Пользователи</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+2350</div>
                        <p className="text-xs text-muted-foreground">
                            Общее количество сотрудников в системе
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-1">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Динамика регистраций</CardTitle>
                        <CardDescription>
                            Новые бизнесы за последнее время.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[200px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={chartData.length ? chartData : [{ name: "Сегодня", total: 0 }]}
                                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="total" stroke="#8884d8" fillOpacity={1} fill="url(#colorTotal)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tenants Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Управление арендаторами</CardTitle>
                    <CardDescription>Изменение подписок, дополнений и блокировка.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Бизнес</TableHead>
                                <TableHead>Тип</TableHead>
                                <TableHead>Статус</TableHead>
                                <TableHead>Подписка</TableHead>
                                <TableHead className="text-right">Действия</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingTenants ? (
                                <TableRow><TableCell colSpan={5} className="text-center">Загрузка...</TableCell></TableRow>
                            ) : tenants.map((tenant) => (
                                <TableRow key={tenant.id}>
                                    <TableCell className="font-medium">{tenant.name}</TableCell>
                                    <TableCell>{tenant.businessType}</TableCell>
                                    <TableCell>
                                        <Badge variant={tenant.status === "active" ? "default" : tenant.status === "blocked" ? "destructive" : "secondary"}>
                                            {tenant.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <select
                                            className="text-sm border rounded p-1 bg-background"
                                            value={tenant.subscriptionId || ""}
                                            onChange={(e) => updateTenantSubscription.mutate({ id: tenant.id, subscriptionId: e.target.value || null })}
                                        >
                                            <option value="">Без подписки</option>
                                            {subscriptions.map(s => (
                                                <option key={s.id} value={s.id}>{s.name} ({s.price} ₸)</option>
                                            ))}
                                        </select>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-[250px]">
                                                <DropdownMenuLabel>Действия с аккаунтом</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => updateTenantStatus.mutate({ id: tenant.id, status: tenant.status === 'blocked' ? 'active' : 'blocked' })}>
                                                    <ShieldAlert className="mr-2 h-4 w-4 text-destructive" />
                                                    <span>{tenant.status === 'blocked' ? "Разблокировать" : "Заблокировать"}</span>
                                                </DropdownMenuItem>

                                                <DropdownMenuSeparator />
                                                <DropdownMenuLabel>Дополнения (Add-ons)</DropdownMenuLabel>

                                                <div className="p-2 space-y-3">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="flex items-center"><Bot className="w-4 h-4 mr-2" /> AI Telegram Bot</span>
                                                        <Switch
                                                            onCheckedChange={(v) => {
                                                                const aiBot = addons.find(a => a.type === 'ai_bot');
                                                                if (aiBot) toggleTenantAddon.mutate({ tenantId: tenant.id, addonId: aiBot.id, active: v });
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="flex items-center"><MessageSquare className="w-4 h-4 mr-2" /> SMS Пакет</span>
                                                        <Switch
                                                            onCheckedChange={(v) => {
                                                                const smsType = addons.find(a => a.type === 'sms');
                                                                if (smsType) toggleTenantAddon.mutate({ tenantId: tenant.id, addonId: smsType.id, active: v });
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
