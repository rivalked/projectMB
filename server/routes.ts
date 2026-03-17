import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import * as xlsx from "xlsx";
import { storage } from "./storage";
import {
  authenticateAccess,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  isRefreshJtiValid,
  setRefreshCookie,
  clearRefreshCookie,
  readRefreshCookie,
  rotateRefreshToken,
  getAccessTokenTtlSeconds,
} from "./auth";
import { ZodError } from "zod";

function respondZodError(res: any, error: unknown) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: "Invalid request data",
      errors: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  return res.status(400).json({ message: "Invalid request data" });
}
import {
  loginSchema, insertBranchSchema, insertClientSchema,
  insertEmployeeSchema, insertServiceSchema, insertAppointmentSchema,
  insertPaymentSchema, insertInventorySchema, insertTenantSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role, tenantId: user.tenantId });
      const { token: refreshToken, jti } = generateRefreshToken({ id: user.id, email: user.email, role: user.role, tenantId: user.tenantId });
      setRefreshCookie(res, refreshToken);

      res.json({
        token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
        },
        expiresIn: getAccessTokenTtlSeconds(),
      });
    } catch (error) {
      return respondZodError(res, error);
    }
  });

  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const token = readRefreshCookie(req);
      if (!token) return res.status(401).json({ message: "No refresh token" });

      const payload = verifyRefreshToken(token);
      if (!payload?.id || !(await isRefreshJtiValid(payload.jti))) {
        return res.status(403).json({ message: "Invalid refresh token" });
      }

      // rotate refresh token
      const { token: newRefresh } = rotateRefreshToken(payload.jti, { id: payload.id, email: payload.email, role: payload.role, tenantId: payload.tenantId });
      setRefreshCookie(res, newRefresh);

      const accessToken = generateAccessToken({ id: payload.id, email: payload.email, role: payload.role, tenantId: payload.tenantId });
      return res.json({ token: accessToken, expiresIn: getAccessTokenTtlSeconds() });
    } catch (e) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    const token = readRefreshCookie(req);
    try {
      if (token) {
        const payload = verifyRefreshToken(token);
        if (payload?.jti) {
          // best-effort revoke
          import("./auth").then(m => m.revokeRefreshToken(payload.jti));
        }
      }
    } catch { }
    clearRefreshCookie(res);
    return res.status(204).send();
  });

  app.get("/api/auth/me", authenticateAccess, async (req: any, res) => {
    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId
    });
  });

  // Super Admin Middleware
  const requireSuperAdmin = (req: any, res: any, next: any) => {
    if (!req.user || req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Forbidden: Super Admin access required" });
    }
    next();
  };

  // Super Admin Routes
  app.get("/api/super-admin/tenants", authenticateAccess, requireSuperAdmin, async (req: any, res) => {
    const tenants = await (storage as any).getTenants();
    res.json(tenants);
  });

  app.patch("/api/super-admin/tenants/:id", authenticateAccess, requireSuperAdmin, async (req: any, res) => {
    try {
      const data = insertTenantSchema.partial().parse(req.body);
      const tenant = await (storage as any).updateTenant(req.params.id, data);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });
      res.json(tenant);
    } catch (error) {
      return respondZodError(res, error);
    }
  });

  app.get("/api/super-admin/subscriptions", authenticateAccess, requireSuperAdmin, async (req: any, res) => {
    const subs = await (storage as any).getSubscriptions();
    res.json(subs);
  });

  app.get("/api/super-admin/addons", authenticateAccess, requireSuperAdmin, async (req: any, res) => {
    const addons = await (storage as any).getAddons();
    res.json(addons);
  });

  app.get("/api/super-admin/tenants/:id/addons", authenticateAccess, requireSuperAdmin, async (req: any, res) => {
    const addons = await (storage as any).getTenantAddons(req.params.id);
    res.json(addons);
  });

  app.patch("/api/super-admin/tenants/:id/addons", authenticateAccess, requireSuperAdmin, async (req: any, res) => {
    const { addonId, active } = req.body;
    if (!addonId || active === undefined) return res.status(400).json({ message: "addonId and active required" });

    const tenantAddon = await (storage as any).updateTenantAddon(req.params.id, addonId, active);
    res.json(tenantAddon);
  });

  // Billing and Subscriptions (Click/Payme)
  app.post("/api/payments/subscribe", authenticateAccess, async (req: any, res) => {
    const { subscriptionId, provider } = req.body;
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: "Valid tenant required" });
    }

    // Generate mock payment URL
    const paymentUrl = `https://mock-${provider}.uz/pay?account=${tenantId}&amount=100000`;
    res.json({ url: paymentUrl, orderId: "mock_order_123" });
  });

  app.post("/api/payments/callback/:provider", async (req, res) => {
    // Mocking Click/Payme webhook handling
    const { provider } = req.params;
    const { tenantId, subscriptionId, status } = req.body;

    if (status === "success" && tenantId && subscriptionId) {
      // Logic to assign subscription to tenant
      if ((storage as any).updateTenant) {
        await (storage as any).updateTenant(tenantId, { subscriptionId, status: 'active' });
      }
      return res.json({ success: true, message: `Payment verified via ${provider}` });
    }

    res.status(400).json({ success: false, message: "Invalid payment payload" });
  });

  app.post("/api/addons/purchase", authenticateAccess, async (req: any, res) => {
    const { addonId } = req.body;
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: "Valid tenant required" });
    }

    if ((storage as any).addTenantAddon) {
      await (storage as any).addTenantAddon({ tenantId, addonId, active: true });
    }

    res.json({ success: true, message: "Addon purchased successfully" });
  });

  // Settings / Integrations
  app.patch("/api/tenant/settings", authenticateAccess, async (req: any, res) => {
    try {
      const { telegramBotToken, botEnabled } = req.body;
      const tenant = await (storage as any).updateTenant(req.user.tenantId, {
        telegramBotToken,
        botEnabled
      });
      res.json(tenant);
    } catch (error) {
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Telegram Bot Webhook (Phase 6)
  app.post("/api/bot/webhook/:tenantId", async (req, res) => {
    try {
      const { tenantId } = req.params;
      const tenant = await (storage as any).getTenant(tenantId);

      if (!tenant || !tenant.botEnabled) {
        return res.status(404).json({ ok: false, message: "Bot not enabled for this tenant" });
      }

      // Mock Telegram message structure handling
      const message = req.body.message;
      if (!message || !message.text) {
        return res.status(200).json({ ok: true }); // Ignore non-text messages
      }

      const text = message.text.toLowerCase();
      let replyText = "Я пока не понимаю этот запрос.";

      if (text.includes("услуг") || text.includes("прайс") || text.includes("цен")) {
        const services = await storage.getServices(tenantId);
        replyText = "Список наших услуг:\n" + services.map(s => `- ${s.name}: ${s.price} ₸`).join("\n");
      } else if (text.includes("запись") || text.includes("записаться")) {
        replyText = `Вы можете записаться онлайн по этой ссылке: https://crm.yourdomain.com/book/${tenantId}`;
      } else {
        replyText = `Здравствуйте! Я умный ассистент ${tenant.name}. Вы можете спросить меня: "Какие у вас услуги?" или "Как записаться?"`;
      }

      // Here you would typically POST to https://api.telegram.org/bot<token>/sendMessage
      // We will mock this by returning the response
      console.log(`[AI Bot] Replying to chat ${message.chat?.id} for tenant ${tenant.name}:`, replyText);

      res.status(200).json({
        method: "sendMessage",
        chat_id: message.chat?.id,
        text: replyText
      });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ ok: false });
    }
  });

  // Public Booking Routes
  app.get("/api/public/tenant/:id/info", async (req, res) => {
    const tenant = await (storage as any).getTenant(req.params.id);
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });

    // get services and employees for this tenant
    const services = await storage.getServices(tenant.id);
    const employees = await storage.getEmployees(tenant.id);

    res.json({
      tenant: { name: tenant.name, businessType: tenant.businessType },
      services,
      employees,
    });
  });

  app.post("/api/public/appointments", async (req, res) => {
    try {
      const { tenantId, name, phone, serviceId, employeeId, appointmentDate } = req.body;
      if (!tenantId || !name || !phone || !serviceId || !employeeId || !appointmentDate) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const clients = await storage.getClients(tenantId);
      let client = clients.find(c => c.phone === phone);

      if (!client) {
        client = await storage.createClient(tenantId, { name, phone });
      }

      const aptData = {
        clientId: client.id,
        serviceId,
        employeeId,
        branchId: "default", // simplifying for widget, we just use default branch
        appointmentDate: new Date(appointmentDate),
        status: "scheduled",
        notes: "Online booking",
      };

      const appointment = await storage.createAppointment(tenantId, aptData as any);
      res.status(201).json(appointment);
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: "Failed to book online" });
    }
  });

  // Dashboard statistics
  app.get("/api/dashboard/stats", authenticateAccess, async (req: any, res) => {
    const tenantId = req.user.tenantId;
    const clients = await storage.getClients(tenantId);
    const appointments = await storage.getAppointments(tenantId);
    const payments = await storage.getPayments(tenantId);
    const services = await storage.getServices(tenantId);
    const employees = await storage.getEmployees(tenantId);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // KPI: Today's Appointments
    const todayAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.appointmentDate);
      return aptDate >= today && aptDate < tomorrow;
    });

    // KPI: Weekly Revenue & Chart Data
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6); // Last 7 days including today

    // Revenue Data Array for Chart
    const daysOfWeek = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    const revenueMap = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      revenueMap.set(daysOfWeek[d.getDay()], 0);
    }

    const weeklyPayments = payments.filter(payment => {
      const createdAt = payment.createdAt ? new Date(payment.createdAt) : new Date();
      return createdAt >= weekStart;
    });

    let weeklyRevenue = 0;
    weeklyPayments.forEach(payment => {
      const amount = parseFloat(payment.amount);
      weeklyRevenue += amount;
      const paymentDate = payment.createdAt ? new Date(payment.createdAt) : new Date();
      if (paymentDate >= weekStart) {
        const dayName = daysOfWeek[paymentDate.getDay()];
        revenueMap.set(dayName, (revenueMap.get(dayName) || 0) + amount);
      }
    });

    const revenueData = Array.from(revenueMap.entries()).map(([name, revenue]) => ({ name, revenue }));

    // KPI: Average Check
    const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const averageCheck = payments.length > 0 ? Math.round(totalRevenue / payments.length) : 0;

    // KPI: Retention Rate (clients with > 1 visit)
    const returningClients = clients.filter(c => (c.totalVisits || 0) > 1).length;
    const retentionRate = clients.length > 0 ? Math.round((returningClients / clients.length) * 100) : 0;

    // Chart: Service Popularity
    const serviceCounts: Record<string, number> = {};
    appointments.forEach(apt => {
      if (apt.serviceId) {
        serviceCounts[apt.serviceId] = (serviceCounts[apt.serviceId] || 0) + 1;
      }
    });
    const servicePopularityData = Object.entries(serviceCounts)
      .map(([svcId, count]) => {
        const svc = services.find(s => s.id === svcId);
        return { name: svc?.name || "Неизвестно", value: count };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);

    // Chart: Employee Performance
    const employeeCounts: Record<string, number> = {};
    appointments.forEach(apt => {
      if (apt.employeeId) {
        employeeCounts[apt.employeeId] = (employeeCounts[apt.employeeId] || 0) + 1;
      }
    });
    const employeePerformanceData = Object.entries(employeeCounts)
      .map(([empId, count]) => {
        const emp = employees.find(e => e.id === empId);
        return { name: emp?.name || "Неизвестно", value: count };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Upcoming Appointments List (Next 4)
    const upcomingAppointments = appointments
      .filter(apt => new Date(apt.appointmentDate) >= now)
      .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())
      .slice(0, 4)
      .map(apt => {
        const client = clients.find(c => c.id === apt.clientId);
        const service = services.find(s => s.id === apt.serviceId);
        const employee = employees.find(e => e.id === apt.employeeId);
        const aptDate = new Date(apt.appointmentDate);
        return {
          id: apt.id,
          clientName: client?.name || "Без имени",
          service: service?.name || "Услуга",
          employee: employee?.name || "Мастер",
          time: String(aptDate.getHours()).padStart(2, '0') + ":" + String(aptDate.getMinutes()).padStart(2, '0')
        };
      });

    res.json({
      totalClients: clients.length,
      todayAppointments: todayAppointments.length,
      weeklyRevenue,
      staffUtilization: 78, // Placeholder
      averageCheck,
      retentionRate,
      revenueData: revenueData.length ? revenueData : [{ name: "Нет данных", revenue: 0 }],
      servicePopularityData: servicePopularityData.length ? servicePopularityData : [{ name: "Нет данных", value: 1 }],
      employeePerformanceData: employeePerformanceData.length ? employeePerformanceData : [{ name: "Нет данных", value: 1 }],
      upcomingAppointments
    });
  });

  // Finance
  app.get("/api/finance/p-and-l", authenticateAccess, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;

      const payments = await storage.getPayments(tenantId);
      const expenses = await storage.getExpenses(tenantId);
      const appointments = await storage.getAppointments(tenantId);
      const employees = await storage.getEmployees(tenantId);
      const services = await storage.getServices(tenantId);

      // Gross Revenue: Sum of completed payments
      const grossRevenue = payments
        .filter((p) => p.status === "completed")
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);

      // Payroll calculation
      let payroll = 0;
      const completedAppointments = appointments.filter((a) => a.status === "completed");
      completedAppointments.forEach((apt) => {
        const emp = employees.find((e) => e.id === apt.employeeId);
        const svc = services.find((s) => s.id === apt.serviceId);
        if (emp && svc && svc.price) {
          const aptPrice = parseFloat(svc.price);
          const salaryRate = parseFloat(emp.salaryRate as any || "0");
          if (emp.salaryType === "percentage") {
            payroll += aptPrice * (salaryRate / 100);
          } else if (emp.salaryType === "fixed") {
            // Very simplified fixed calc - per appointment? Normally fixed is per month, but for simplicity:
            payroll += salaryRate;
          } else if (emp.salaryType === "hybrid") {
            payroll += aptPrice * (salaryRate / 100); // simplify hybrid as well just percentage here
          }
        }
      });

      // OPEX
      const opex = expenses.reduce((sum, e) => sum + parseFloat(e.amount as any || "0"), 0);

      // COGS - Very simplified: if we had inventory_used, we'd use that.
      // For now, let's just use costPrice of services performed + 0.
      let cogs = 0;
      completedAppointments.forEach((apt) => {
        const svc = services.find((s) => s.id === apt.serviceId);
        if (svc) {
          cogs += parseFloat(svc.costPrice as any || "0");
        }
      });

      const netProfit = grossRevenue - cogs - payroll - opex;

      res.json({
        grossRevenue,
        cogs,
        payroll,
        opex,
        netProfit,
        currency: "UZS" // enforcing strict UZS currency rules
      });
    } catch (error: any) {
      console.error("Error calculating P&L:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Branches routes
  app.get("/api/branches", authenticateAccess, async (req: any, res) => {
    const branches = await storage.getBranches(req.user.tenantId);
    res.json(branches);
  });

  app.post("/api/branches", authenticateAccess, async (req: any, res) => {
    try {
      const data = insertBranchSchema.parse(req.body);
      const branch = await storage.createBranch(req.user.tenantId, data);
      res.status(201).json(branch);
    } catch (error) {
      return respondZodError(res, error);
    }
  });

  app.get("/api/branches/:id", authenticateAccess, async (req: any, res) => {
    const branch = await storage.getBranch(req.params.id, req.user.tenantId);
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }
    res.json(branch);
  });

  app.put("/api/branches/:id", authenticateAccess, async (req: any, res) => {
    try {
      const data = insertBranchSchema.partial().parse(req.body);
      const branch = await storage.updateBranch(req.params.id, req.user.tenantId, data);
      if (!branch) {
        return res.status(404).json({ message: "Branch not found" });
      }
      res.json(branch);
    } catch (error) {
      return respondZodError(res, error);
    }
  });

  app.delete("/api/branches/:id", authenticateAccess, async (req: any, res) => {
    const success = await storage.deleteBranch(req.params.id, req.user.tenantId);
    if (!success) {
      return res.status(404).json({ message: "Branch not found" });
    }
    res.status(204).send();
  });

  // Clients routes
  app.get("/api/clients", authenticateAccess, async (req: any, res) => {
    const clients = await storage.getClients(req.user.tenantId);
    res.json(clients);
  });

  app.post("/api/clients", authenticateAccess, async (req: any, res) => {
    try {
      const data = insertClientSchema.parse(req.body);
      const client = await storage.createClient(req.user.tenantId, data);
      res.status(201).json(client);
    } catch (error) {
      return respondZodError(res, error);
    }
  });

  app.get("/api/clients/:id", authenticateAccess, async (req: any, res) => {
    const client = await storage.getClient(req.params.id, req.user.tenantId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    res.json(client);
  });

  app.put("/api/clients/:id", authenticateAccess, async (req: any, res) => {
    try {
      const data = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(req.params.id, req.user.tenantId, data);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      return respondZodError(res, error);
    }
  });

  app.delete("/api/clients/:id", authenticateAccess, async (req: any, res) => {
    const success = await storage.deleteClient(req.params.id, req.user.tenantId);
    if (!success) {
      return res.status(404).json({ message: "Client not found" });
    }
    res.status(204).send();
  });

  // Client Excel Export
  app.get("/api/clients/export", authenticateAccess, async (req: any, res) => {
    try {
      const clients = await storage.getClients(req.user.tenantId);
      const data = clients.map(client => ({
        "Имя": client.name,
        "Телефон": client.phone,
        "Email": client.email || "",
        "Бонусы": client.bonusPoints || 0,
        "Визиты": client.totalVisits || 0,
      }));
      const ws = xlsx.utils.json_to_sheet(data);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "Клиенты");
      const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="clients.xlsx"');
      res.send(buffer);
    } catch (e) {
      res.status(500).json({ message: "Export failed" });
    }
  });

  // Employees routes
  app.get("/api/employees", authenticateAccess, async (req: any, res) => {
    const employees = await storage.getEmployees(req.user.tenantId);
    res.json(employees);
  });

  app.post("/api/employees", authenticateAccess, async (req: any, res) => {
    try {
      const data = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(req.user.tenantId, data);
      res.status(201).json(employee);
    } catch (error) {
      return respondZodError(res, error);
    }
  });

  app.get("/api/employees/:id", authenticateAccess, async (req: any, res) => {
    const employee = await storage.getEmployee(req.params.id, req.user.tenantId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.json(employee);
  });

  app.put("/api/employees/:id", authenticateAccess, async (req: any, res) => {
    try {
      const data = insertEmployeeSchema.partial().parse(req.body);
      const employee = await storage.updateEmployee(req.params.id, req.user.tenantId, data);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      return respondZodError(res, error);
    }
  });

  app.delete("/api/employees/:id", authenticateAccess, async (req: any, res) => {
    const success = await storage.deleteEmployee(req.params.id, req.user.tenantId);
    if (!success) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.status(204).send();
  });

  // Services routes
  app.get("/api/services", authenticateAccess, async (req: any, res) => {
    const services = await storage.getServices(req.user.tenantId);
    res.json(services);
  });

  app.post("/api/services", authenticateAccess, async (req: any, res) => {
    try {
      const data = insertServiceSchema.parse(req.body);
      const service = await storage.createService(req.user.tenantId, data);
      res.status(201).json(service);
    } catch (error) {
      return respondZodError(res, error);
    }
  });

  app.get("/api/services/:id", authenticateAccess, async (req: any, res) => {
    const service = await storage.getService(req.params.id, req.user.tenantId);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }
    res.json(service);
  });

  app.put("/api/services/:id", authenticateAccess, async (req: any, res) => {
    try {
      const data = insertServiceSchema.partial().parse(req.body);
      const service = await storage.updateService(req.params.id, req.user.tenantId, data);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      return respondZodError(res, error);
    }
  });

  app.delete("/api/services/:id", authenticateAccess, async (req: any, res) => {
    const success = await storage.deleteService(req.params.id, req.user.tenantId);
    if (!success) {
      return res.status(404).json({ message: "Service not found" });
    }
    res.status(204).send();
  });

  // Appointments routes
  app.get("/api/appointments", authenticateAccess, async (req: any, res) => {
    const appointments = await storage.getAppointments(req.user.tenantId);
    res.json(appointments);
  });

  app.post("/api/appointments", authenticateAccess, async (req: any, res) => {
    try {
      const data = insertAppointmentSchema.parse(req.body);
      const appointment = await storage.createAppointment(req.user.tenantId, data);
      res.status(201).json(appointment);
    } catch (error) {
      return respondZodError(res, error);
    }
  });

  app.get("/api/appointments/:id", authenticateAccess, async (req: any, res) => {
    const appointment = await storage.getAppointment(req.params.id, req.user.tenantId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    res.json(appointment);
  });

  app.put("/api/appointments/:id", authenticateAccess, async (req: any, res) => {
    try {
      const data = insertAppointmentSchema.partial().parse(req.body);
      const appointment = await storage.updateAppointment(req.params.id, req.user.tenantId, data);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      res.json(appointment);
    } catch (error) {
      return respondZodError(res, error);
    }
  });

  app.delete("/api/appointments/:id", authenticateAccess, async (req: any, res) => {
    const success = await storage.deleteAppointment(req.params.id, req.user.tenantId);
    if (!success) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    res.status(204).send();
  });

  // Payments routes
  app.get("/api/payments", authenticateAccess, async (req: any, res) => {
    const payments = await storage.getPayments(req.user.tenantId);
    res.json(payments);
  });

  app.post("/api/payments", authenticateAccess, async (req: any, res) => {
    try {
      const data = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(req.user.tenantId, data);

      // Phase 5: Loyalty Program - 5% Bonus Points on successful payment
      if (payment.status === "completed" && payment.clientId) {
        const client = await storage.getClient(payment.clientId, req.user.tenantId);
        if (client) {
          const pointsEarned = Math.floor(parseFloat(data.amount) * 0.05);
          await (storage as any).updateClient(client.id, req.user.tenantId, {
            bonusPoints: (client.bonusPoints || 0) + pointsEarned
          });
        }
      }

      res.status(201).json(payment);
    } catch (error) {
      return respondZodError(res, error);
    }
  });

  // Inventory routes
  app.get("/api/inventory", authenticateAccess, async (req: any, res) => {
    const inventory = await storage.getInventory(req.user.tenantId);
    res.json(inventory);
  });

  app.post("/api/inventory", authenticateAccess, async (req: any, res) => {
    try {
      if (!req.user || !req.user.tenantId) {
        return res.status(403).json({ message: "У вас нет доступа к добавлению материалов (отсутствует tenantId)" });
      }
      const data = insertInventorySchema.parse(req.body);

      // Ensure category is passed efficiently
      const item = await storage.createInventoryItem(req.user.tenantId, data);
      res.status(201).json(item);
    } catch (error) {
      console.error("POST /api/inventory error:", error);
      return respondZodError(res, error);
    }
  });

  app.get("/api/inventory/:id", authenticateAccess, async (req: any, res) => {
    const item = await storage.getInventoryItem(req.params.id, req.user.tenantId);
    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }
    res.json(item);
  });

  app.put("/api/inventory/:id", authenticateAccess, async (req: any, res) => {
    try {
      const data = insertInventorySchema.partial().parse(req.body);
      const item = await storage.updateInventoryItem(req.params.id, req.user.tenantId, data);
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(item);
    } catch (error) {
      return respondZodError(res, error);
    }
  });

  app.delete("/api/inventory/:id", authenticateAccess, async (req: any, res) => {
    const success = await storage.deleteInventoryItem(req.params.id, req.user.tenantId);
    if (!success) {
      return res.status(404).json({ message: "Inventory item not found" });
    }
    res.status(204).send();
  });

  // Inventory Excel Export
  app.get("/api/inventory/export", authenticateAccess, async (req: any, res) => {
    try {
      const inventory = await storage.getInventory(req.user.tenantId);
      const branches = await storage.getBranches(req.user.tenantId);
      const data = inventory.map(item => ({
        "Название": item.name,
        "Категория": item.category || "general",
        "Количество": item.quantity,
        "Мин. остаток": item.minQuantity,
        "Ед. изм.": item.unit,
        "Филиал": branches.find(b => b.id === item.branchId)?.name || "Общий склад",
      }));
      const ws = xlsx.utils.json_to_sheet(data);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "Склад");
      const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="inventory.xlsx"');
      res.send(buffer);
    } catch (e) {
      res.status(500).json({ message: "Export failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
