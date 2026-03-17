import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { authenticatedApiRequest } from "@/lib/auth";
import { Bot, Save } from "lucide-react";
import type { User } from "@shared/schema";

export default function Settings() {
    const { t } = useI18n();
    const { toast } = useToast();

    const { data: user } = useQuery<User>({ queryKey: ["/api/auth/me"] });

    // We fetch tenant directly here for settings if we don't already have it
    // In a real app we might have a specific /api/tenant/me endpoint
    // Using user.tenantId to find out, but user only has tenantId string.
    // Actually, we can just use the fact that we can do a save request to check.

    const [token, setToken] = useState("");
    const [botEnabled, setBotEnabled] = useState(false);
    const [webhookUrl, setWebhookUrl] = useState("");

    useEffect(() => {
        // Basic init if we had tenant info on the user object, but we don't.
        // If the tenant object were fetched, we'd initialize these here.
        if (user?.tenantId) {
            setWebhookUrl(`${window.location.origin}/api/bot/webhook/${user.tenantId}`);
        }
    }, [user]);

    const updateSettingsMutation = useMutation({
        mutationFn: async () => {
            const res = await authenticatedApiRequest("PATCH", "/api/tenant/settings", {
                telegramBotToken: token,
                botEnabled,
            });
            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "Успешно",
                description: "Настройки успешно сохранены",
            });
        },
        onError: () => {
            toast({
                variant: "destructive",
                title: "Ошибка",
                description: "Не удалось сохранить настройки",
            });
        }
    });

    return (
        <div className="space-y-6 animate-in fade-in">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Настройки и Интеграции</h1>
                <p className="text-muted-foreground mt-2">
                    Управляйте интеграциями и глобальными настройками вашего бизнеса.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Telegram AI Bot Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Bot className="w-5 h-5 mr-2 text-primary" />
                            Telegram AI Ассистент
                        </CardTitle>
                        <CardDescription>
                            Настройте ИИ-бота для автоматических ответов вашим клиентам в Telegram.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Включить ИИ Бота</Label>
                                <p className="text-sm text-muted-foreground">
                                    Бот будет отвечать на сообщения клиентов
                                </p>
                            </div>
                            <Switch
                                checked={botEnabled}
                                onCheckedChange={setBotEnabled}
                            />
                        </div>

                        <div className="space-y-2 pt-2">
                            <Label>Telegram Bot Token</Label>
                            <Input
                                type="password"
                                placeholder="1234567890:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Получите токен у @BotFather в Telegram.
                            </p>
                        </div>

                        {user?.tenantId && (
                            <div className="space-y-2 pt-2">
                                <Label>Webhook URL (для @BotFather)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        readOnly
                                        value={webhookUrl}
                                        className="bg-muted text-xs"
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            navigator.clipboard.writeText(webhookUrl);
                                            toast({ description: "Скопировано в буфер обмена" });
                                        }}
                                    >
                                        Копировать
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button
                            onClick={() => updateSettingsMutation.mutate()}
                            disabled={updateSettingsMutation.isPending}
                            className="w-full"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {updateSettingsMutation.isPending ? "Сохранение..." : "Сохранить настройки"}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
