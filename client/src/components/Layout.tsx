import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Users, 
  Bus, 
  Scissors, 
  Calendar, 
  ChartPie, 
  Package, 
  Building,
  Bell,
  LogOut
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

const navigation = [
  { name: "Панель управления", href: "/", icon: LayoutDashboard, page: "dashboard" },
  { name: "Клиенты", href: "/clients", icon: Users, page: "clients" },
  { name: "Сотрудники", href: "/employees", icon: Bus, page: "employees" },
  { name: "Услуги", href: "/services", icon: Scissors, page: "services" },
  { name: "Записи", href: "/appointments", icon: Calendar, page: "appointments" },
  { name: "Финансы", href: "/finance", icon: ChartPie, page: "finance" },
  { name: "Склад", href: "/inventory", icon: Package, page: "inventory" },
  { name: "Филиалы", href: "/branches", icon: Building, page: "branches" },
];

const pageKeyMap: Record<string, string> = {
  "/": "dashboard",
  "/clients": "clients",
  "/employees": "employees",
  "/services": "services",
  "/appointments": "appointments",
  "/finance": "finance",
  "/inventory": "inventory",
  "/branches": "branches",
};

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const user = auth.getUser();
  const [expiringSoon, setExpiringSoon] = useState(false);
  const { t, lang, setLang } = useI18n();

  useEffect(() => {
    const update = () => {
      const remaining = auth.getSecondsUntilExpiry();
      if (remaining === null) {
        setExpiringSoon(false);
        return;
      }
      setExpiringSoon(remaining <= 120);
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);

  const handleLogout = () => {
    auth.logout();
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex h-screen" data-testid="main-layout">
      {/* Sidebar */}
      <aside className="w-60 bg-card border-r border-border flex flex-col" data-testid="sidebar">
        <div className="p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Scissors className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold">{t("app_title")}</h1>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              
              return (
                <li key={item.name}>
                  <Link href={item.href}>
                    <div 
                      className={`sidebar-item flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium ${
                        isActive ? "active" : ""
                      }`}
                      data-testid={`nav-${item.page}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{
                        item.page === "dashboard" ? t("dashboard") :
                        item.page === "clients" ? t("clients") :
                        item.page === "employees" ? t("employees") :
                        item.page === "services" ? t("services") :
                        item.page === "appointments" ? t("appointments") :
                        item.page === "finance" ? t("finance") :
                        item.page === "inventory" ? t("inventory") :
                        item.page === "branches" ? t("branches") : item.name
                      }</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6" data-testid="header">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold" data-testid="page-title">
              {t(pageKeyMap[location] || "dashboard")}
            </h2>
            {expiringSoon && (
              <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-800" data-testid="token-expiry-warning">
                {t("session_expiring_soon")}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as any)}
              className="text-xs border rounded px-2 py-1 bg-background"
              data-testid="lang-switcher"
            >
              <option value="ru">RU</option>
              <option value="uz">UZ</option>
            </select>
            <Button variant="ghost" size="icon" data-testid="notifications-button">
              <Bell className="h-4 w-4 text-muted-foreground" />
            </Button>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-medium" data-testid="user-initials">
                  {user ? getUserInitials(user.name) : "U"}
                </span>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium" data-testid="user-name">
                  {user?.name || t("user")}
                </p>
                <p className="text-xs text-muted-foreground" data-testid="user-role">
                  {user?.role === "admin" ? t("admin") : t("user")}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout}
                data-testid="logout-button"
              >
                <LogOut className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto" data-testid="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
