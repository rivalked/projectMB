import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, setHours, setMinutes } from "date-fns";
import { ru } from "date-fns/locale";
import { CheckCircle2, ChevronRight, MapPin, Phone } from "lucide-react";
import type { Employee, Service } from "@shared/schema";

interface TenantInfo {
    tenant: { name: string; businessType: string };
    services: Service[];
    employees: Employee[];
}

export default function PublicBooking() {
    const [, params] = useRoute("/book/:tenantId");
    const tenantId = params?.tenantId || "";
    const { toast } = useToast();

    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [selectedService, setSelectedService] = useState<string>("");
    const [selectedEmployee, setSelectedEmployee] = useState<string>("");
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedTime, setSelectedTime] = useState<string>("");
    const [clientName, setClientName] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);

    // Example available times (9:00 to 18:00)
    const availableTimes = Array.from({ length: 10 }).map((_, i) => `${i + 9}:00`);

    const { data: info, isLoading } = useQuery<TenantInfo>({
        queryKey: [`/api/public/tenant/${tenantId}/info`],
        enabled: !!tenantId,
    });

    const bookMutation = useMutation({
        mutationFn: async () => {
            const [hours, minutes] = selectedTime.split(":").map(Number);
            const appointmentDate = setMinutes(setHours(selectedDate, hours), minutes);

            const res = await apiRequest("POST", "/api/public/appointments", {
                tenantId,
                name: clientName,
                phone: clientPhone,
                serviceId: selectedService,
                employeeId: selectedEmployee,
                appointmentDate: appointmentDate.toISOString(),
            });
            return res.json();
        },
        onSuccess: () => {
            setIsSuccess(true);
        },
        onError: () => {
            toast({
                variant: "destructive",
                title: "Ошибка",
                description: "Не удалось создать запись. Попробуйте еще раз.",
            });
        }
    });

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!info) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
                <Card className="max-w-md w-full mx-4">
                    <CardContent className="pt-6 text-center">
                        <h2 className="text-xl font-semibold mb-2">Бизнес не найден</h2>
                        <p className="text-muted-foreground">Не удалось загрузить данные для онлайн записи.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50/50 px-4 py-8">
                <Card className="max-w-md w-full shadow-lg border-primary/20">
                    <CardContent className="pt-10 pb-8 text-center">
                        <CheckCircle2 className="h-16 w-16 mx-auto text-success mb-6" />
                        <h2 className="text-2xl font-bold mb-2">Вы успешно записаны!</h2>
                        <p className="text-muted-foreground mb-6">
                            Ждем вас в назначенное время. Детали записи сохранены за бизнесом <strong>{info.tenant.name}</strong>.
                        </p>
                        <Button className="w-full" onClick={() => window.location.reload()}>
                            Сделать новую запись
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 flex py-8 px-4 justify-center">
            <Card className="w-full max-w-lg shadow-lg">
                <CardHeader className="text-center border-b pb-6">
                    <CardTitle className="text-2xl">{info.tenant.name}</CardTitle>
                    <CardDescription className="flex items-center justify-center mt-2 space-x-4">
                        <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" /> Ваш город</span>
                        <span className="flex items-center"><Phone className="w-3 h-3 mr-1" /> Онлайн запись</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {step === 1 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                            <h3 className="text-lg font-medium mb-4">Выберите услугу</h3>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                {info.services.map(service => (
                                    <button
                                        key={service.id}
                                        onClick={() => { setSelectedService(service.id); setStep(2); }}
                                        className="w-full text-left p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all flex justify-between items-center group"
                                    >
                                        <div>
                                            <p className="font-medium text-foreground">{service.name}</p>
                                            <p className="text-sm text-muted-foreground mt-1">{service.duration} мин • {service.price} ₸</p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                            <div className="flex items-center mb-4">
                                <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="-ml-2 mr-2">
                                    <ChevronRight className="w-4 h-4 rotate-180" /> Назад
                                </Button>
                                <h3 className="text-lg font-medium">К кому запишемся?</h3>
                            </div>
                            <div className="space-y-3">
                                <button
                                    onClick={() => { setSelectedEmployee(info.employees[0]?.id || ""); setStep(3); }}
                                    className="w-full text-left p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all flex items-center space-x-4"
                                >
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="font-semibold text-primary">Люб</span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground">Любой свободный мастер</p>
                                        <p className="text-sm text-muted-foreground">Подберем удобное время</p>
                                    </div>
                                </button>
                                {info.employees.map(emp => (
                                    <button
                                        key={emp.id}
                                        onClick={() => { setSelectedEmployee(emp.id); setStep(3); }}
                                        className="w-full text-left p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all flex items-center space-x-4 group"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium uppercase">
                                            {emp.name.slice(0, 2)}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-foreground group-hover:text-primary transition-colors">{emp.name}</p>
                                            <p className="text-sm text-muted-foreground">{emp.position}</p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="flex items-center mb-2">
                                <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="-ml-2 mr-2">
                                    <ChevronRight className="w-4 h-4 rotate-180" /> Назад
                                </Button>
                                <h3 className="text-lg font-medium">Выберите дату и время</h3>
                            </div>

                            <div className="bg-card border rounded-lg p-2">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={(d) => d && setSelectedDate(d)}
                                    locale={ru}
                                    className="rounded-md mx-auto"
                                    disabled={{ before: new Date() }}
                                />
                            </div>

                            <div>
                                <h4 className="font-medium mb-3">Доступное время</h4>
                                <div className="grid grid-cols-4 gap-2">
                                    {availableTimes.map(time => (
                                        <Button
                                            key={time}
                                            variant={selectedTime === time ? "default" : "outline"}
                                            onClick={() => setSelectedTime(time)}
                                            className="text-sm"
                                        >
                                            {time}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <Button
                                className="w-full"
                                size="lg"
                                disabled={!selectedTime}
                                onClick={() => setStep(4)}
                            >
                                Продолжить
                            </Button>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="flex items-center mb-2">
                                <Button variant="ghost" size="sm" onClick={() => setStep(3)} className="-ml-2 mr-2">
                                    <ChevronRight className="w-4 h-4 rotate-180" /> Назад
                                </Button>
                                <h3 className="text-lg font-medium">Ваши контактные данные</h3>
                            </div>

                            <div className="bg-muted/50 p-4 rounded-xl space-y-2 text-sm mb-6">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Услуга:</span>
                                    <span className="font-medium text-right">{info.services.find(s => s.id === selectedService)?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Мастер:</span>
                                    <span className="font-medium text-right">{info.employees.find(e => e.id === selectedEmployee)?.name || "Любой"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Время:</span>
                                    <span className="font-medium text-right">{format(selectedDate, "d MMMM", { locale: ru })}, {selectedTime}</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Имя и Фамилия</Label>
                                    <Input
                                        id="name"
                                        placeholder="Например, Рустам Каримов"
                                        value={clientName}
                                        onChange={(e) => setClientName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Номер телефона</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder="+7 (___) ___-__-__"
                                        value={clientPhone}
                                        onChange={(e) => setClientPhone(e.target.value)}
                                    />
                                </div>
                            </div>

                            <Button
                                className="w-full mt-8"
                                size="lg"
                                onClick={() => bookMutation.mutate()}
                                disabled={!clientName || !clientPhone || bookMutation.isPending}
                            >
                                {bookMutation.isPending ? "Обработка..." : "Записаться"}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
