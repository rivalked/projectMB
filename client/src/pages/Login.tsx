import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { auth } from "@/lib/auth";
import { loginSchema, type LoginData } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Scissors, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const { toast } = useToast();

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginData) => {
    setIsLoading(true);
    setError("");

    try {
      await auth.login(data);
      toast({
        title: "Добро пожаловать!",
        description: "Вход выполнен успешно",
      });
      setLocation("/");
    } catch (err: any) {
      const errorMessage = err.message || "Неверный email или пароль";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Ошибка входа",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary" data-testid="login-page">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Scissors className="h-8 w-8 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold" data-testid="app-title">Салон CRM</h1>
              <p className="text-muted-foreground mt-2">Войдите в систему управления</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email или телефон</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="admin@salon.ru или +7 (999) 123-45-67"
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Пароль</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="Введите пароль"
                            className="pr-10"
                            data-testid="input-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute inset-y-0 right-0 h-full px-3"
                            onClick={() => setShowPassword(!showPassword)}
                            data-testid="toggle-password-visibility"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="remember" data-testid="checkbox-remember" />
                    <label
                      htmlFor="remember"
                      className="text-sm text-muted-foreground cursor-pointer"
                    >
                      Запомнить меня
                    </label>
                  </div>
                  <Button variant="link" className="p-0 h-auto text-sm" data-testid="link-forgot-password">
                    Забыли пароль?
                  </Button>
                </div>

                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3" data-testid="error-message">
                    <div className="flex items-center">
                      <AlertCircle className="h-4 w-4 text-destructive mr-2" />
                      <span className="text-destructive text-sm">{error}</span>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="button-submit"
                >
                  {isLoading ? "Вход..." : "Войти"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>Тестовые данные:</p>
              <p>Email: admin@salon.ru</p>
              <p>Пароль: admin123</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
