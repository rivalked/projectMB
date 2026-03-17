import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
    Building2,
    Scissors,
    Stethoscope,
    Store,
    ArrowRight,
    CheckCircle2,
    Calendar,
    Users,
    CreditCard,
    PieChart
} from "lucide-react";

export default function Landing() {
    const [activeTab, setActiveTab] = useState<"salon" | "clinic" | "retail">("salon");

    const businessTypes = [
        { id: "salon", label: "Салоны красоты", icon: Scissors, color: "text-pink-500", bg: "bg-pink-100 dark:bg-pink-900/30" },
        { id: "clinic", label: "Клиники", icon: Stethoscope, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30" },
        { id: "retail", label: "Магазины", icon: Store, color: "text-green-500", bg: "bg-green-100 dark:bg-green-900/30" },
    ] as const;

    const demoContent = {
        salon: {
            title: "Панель управления салоном",
            stats: [
                { label: "Стрижки сегодня", value: "24" },
                { label: "Свободные мастера", value: "3" },
            ],
            appointments: [
                { time: "10:00", text: "Окрашивание волос - Нигина", status: "В процессе" },
                { time: "11:30", text: "Маникюр - Азиза", status: "Ожидает" },
            ]
        },
        clinic: {
            title: "Регистратура клиники",
            stats: [
                { label: "Пациенты сегодня", value: "48" },
                { label: "Доступные врачи", value: "5" },
            ],
            appointments: [
                { time: "09:00", text: "Консультация терапевта", status: "Завершено" },
                { time: "10:15", text: "УЗИ брюшной полости", status: "В кабинете" },
            ]
        },
        retail: {
            title: "Касса магазина",
            stats: [
                { label: "Продажи за день", value: "142" },
                { label: "Низкий остаток", value: "12 товаров" },
            ],
            appointments: [
                { time: "14:00", text: "Приемка товара: Косметика", status: "Ожидание" },
                { time: "16:00", text: "Инкассация", status: "Запланировано" },
            ]
        }
    };

    const features = [
        { title: "Мультифилиальность", desc: "Управляйте всеми точками из одного окна", icon: Building2 },
        { title: "Онлайн-запись", desc: "Удобный виджет 24/7 для ваших клиентов", icon: Calendar },
        { title: "CRM и Клиенты", desc: "Программы лояльности и история визитов", icon: Users },
        { title: "Финансы и Склад", desc: "Учет доходов, расходов и остатков товаров", icon: PieChart },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground overflow-hidden font-sans">
            {/* Navbar */}
            <nav className="fixed top-0 w-full border-b border-border/40 bg-background/80 backdrop-blur-md z-50">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">CRM Platform</span>
                    </div>
                    <div className="flex items-center space-x-4">
                        <Link href="/login">
                            <Button variant="ghost" className="hidden sm:inline-flex">
                                Войти
                            </Button>
                        </Link>
                        <Link href="/login">
                            <Button>Начать бесплатно</Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6">
                <div className="container mx-auto max-w-5xl text-center">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8"
                    >
                        Единая система для <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
                            любого бизнеса
                        </span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
                    >
                        Автоматизируйте запись, управляйте персоналом и финансами, повышайте лояльность клиентов с нашей мощной CRM-системой нового поколения.
                    </motion.p>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <Link href="/login">
                            <Button size="lg" className="h-14 px-8 text-base group">
                                Попробовать демо
                                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* Interactive Demo Section */}
            <section className="py-20 bg-muted/30">
                <div className="container mx-auto px-6 max-w-6xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4">Настроено под вашу сферу</h2>
                        <p className="text-muted-foreground">Выберите тип бизнеса, чтобы увидеть интерфейс</p>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-8 items-start">
                        {/* Tabs */}
                        <div className="w-full lg:w-1/3 flex flex-row lg:flex-col gap-3 overflow-x-auto pb-4 lg:pb-0">
                            {businessTypes.map((type) => (
                                <button
                                    key={type.id}
                                    onClick={() => setActiveTab(type.id)}
                                    className={`flex items-center gap-4 p-4 rounded-2xl text-left transition-all min-w-[200px] ${activeTab === type.id
                                        ? "bg-card shadow-lg border border-primary/20 scale-[1.02]"
                                        : "hover:bg-card/50 border border-transparent"
                                        }`}
                                >
                                    <div className={`p-3 rounded-xl ${type.bg}`}>
                                        <type.icon className={`w-6 h-6 ${type.color}`} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">{type.label}</h3>
                                        <p className="text-sm text-muted-foreground hidden sm:block">
                                            Специфичный интерфейс
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Interactive Mock UI */}
                        <div className="w-full lg:w-2/3 h-[400px] bg-card rounded-3xl shadow-xl border border-border/50 overflow-hidden relative">
                            <div className="h-12 border-b border-border/50 bg-muted/20 flex items-center px-4 gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-400" />
                                <div className="w-3 h-3 rounded-full bg-amber-400" />
                                <div className="w-3 h-3 rounded-full bg-green-400" />
                            </div>

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="p-8 h-full"
                                >
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-2xl font-bold">{demoContent[activeTab].title}</h3>
                                        <Button variant="outline" size="sm">Отчет за день</Button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 mb-8">
                                        {demoContent[activeTab].stats.map((stat, i) => (
                                            <div key={i} className="p-4 rounded-2xl bg-muted/40 border border-border/50">
                                                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                                                <p className="text-3xl font-bold">{stat.value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div>
                                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                                            <Calendar className="w-4 h-4" /> Расписание
                                        </h4>
                                        <div className="space-y-3">
                                            {demoContent[activeTab].appointments.map((apt, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/40">
                                                    <div className="flex items-center gap-4">
                                                        <span className="font-mono text-sm text-primary">{apt.time}</span>
                                                        <span className="font-medium">{apt.text}</span>
                                                    </div>
                                                    <span className="text-xs px-2 py-1 rounded-full bg-muted">
                                                        {apt.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-24 px-6">
                <div className="container mx-auto max-w-6xl">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="p-6 rounded-3xl bg-card border border-border/50 hover:shadow-lg transition-shadow"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                                    <feature.icon className="w-6 h-6 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                <p className="text-muted-foreground">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Bottom */}
            <section className="py-24 px-6 border-t border-border/40 bg-gradient-to-b from-background to-muted/20">
                <div className="container mx-auto max-w-4xl text-center">
                    <h2 className="text-4xl font-bold mb-6">Готовы масштабировать свой бизнес?</h2>
                    <p className="text-xl text-muted-foreground mb-10">
                        Присоединяйтесь к тысячам компаний, которые уже используют нашу платформу
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/login">
                            <Button size="lg" className="h-14 px-10 text-lg">
                                Начать работу
                            </Button>
                        </Link>
                        <div className="flex items-center text-sm text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                            14 дней бесплатно. Без привязки карты.
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-6 border-t border-border/40 text-center text-muted-foreground">
                <p>© {new Date().getFullYear()} CRM Platform. Все права защищены.</p>
            </footer>
        </div>
    );
}
