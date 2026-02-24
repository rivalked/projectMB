import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
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
  insertPaymentSchema, insertInventorySchema 
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

      const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
      const { token: refreshToken, jti } = generateRefreshToken({ id: user.id, email: user.email, role: user.role });
      setRefreshCookie(res, refreshToken);

      res.json({
        token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
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
      const { token: newRefresh } = rotateRefreshToken(payload.jti, { id: payload.id, email: payload.email, role: payload.role });
      setRefreshCookie(res, newRefresh);

      const accessToken = generateAccessToken({ id: payload.id, email: payload.email, role: payload.role });
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
        }
      }
    } catch {}
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
      role: user.role 
    });
  });

  // Dashboard statistics
  app.get("/api/dashboard/stats", authenticateAccess, async (req, res) => {
    const clients = await storage.getClients();
    const appointments = await storage.getAppointments();
    const payments = await storage.getPayments();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.appointmentDate);
      return aptDate >= today && aptDate < tomorrow;
    });

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weeklyPayments = payments.filter(payment => {
      const createdAt = payment.createdAt ? new Date(payment.createdAt) : new Date();
      return createdAt >= weekStart;
    });

    const weeklyRevenue = weeklyPayments.reduce((sum, payment) => 
      sum + parseFloat(payment.amount), 0
    );

    res.json({
      totalClients: clients.length,
      todayAppointments: todayAppointments.length,
      weeklyRevenue,
      staffUtilization: 78 // This would be calculated based on actual schedule data
    });
  });

  // Branches routes
  app.get("/api/branches", authenticateAccess, async (req, res) => {
    const branches = await storage.getBranches();
    res.json(branches);
  });

  app.post("/api/branches", authenticateAccess, async (req, res) => {
    try {
      const data = insertBranchSchema.parse(req.body);
      const branch = await storage.createBranch(data);
      res.status(201).json(branch);
    } catch (error) {
      return respondZodError(res, error);
    }
  });

  app.get("/api/branches/:id", authenticateAccess, async (req, res) => {
    const branch = await storage.getBranch(req.params.id);
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }
    res.json(branch);
  });

  app.put("/api/branches/:id", authenticateAccess, async (req, res) => {
    try {
      const data = insertBranchSchema.partial().parse(req.body);
      const branch = await storage.updateBranch(req.params.id, data);
      if (!branch) {
        return res.status(404).json({ message: "Branch not found" });
      }
      res.json(branch);
    } catch (error) {
      return respondZodError(res, error);
    }
  });

  app.delete("/api/branches/:id", authenticateAccess, async (req, res) => {
    const success = await storage.deleteBranch(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Branch not found" });
    }
    res.status(204).send();
  });

  // Clients routes
  app.get("/api/clients", authenticateAccess, async (req, res) => {
    const clients = await storage.getClients();
    res.json(clients);
  });

  app.post("/api/clients", authenticateAccess, async (req, res) => {
    try {
      const data = insertClientSchema.parse(req.body);
      const client = await storage.createClient(data);
      res.status(201).json(client);
    } catch (error) {
      return respondZodError(res, error);
    }
  });

  app.get("/api/clients/:id", authenticateAccess, async (req, res) => {
    const client = await storage.getClient(req.params.id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    res.json(client);
  });

  app.put("/api/clients/:id", authenticateAccess, async (req, res) => {
    try {
      const data = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(req.params.id, data);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      return respondZodError(res, error);
    }
  });

  app.delete("/api/clients/:id", authenticateAccess, async (req, res) => {
    const success = await storage.deleteClient(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Client not found" });
    }
    res.status(204).send();
  });

  // Employees routes
  app.get("/api/employees", authenticateAccess, async (req, res) => {
    const employees = await storage.getEmployees();
    res.json(employees);
  });

  app.post("/api/employees", authenticateAccess, async (req, res) => {
    try {
      const data = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(data);
      res.status(201).json(employee);
    } catch (error) {
      return respondZodError(res, error);
    }
  });

  app.get("/api/employees/:id", authenticateAccess, async (req, res) => {
    const employee = await storage.getEmployee(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.json(employee);
  });

  app.put("/api/employees/:id", authenticateAccess, async (req, res) => {
    try {
      const data = insertEmployeeSchema.partial().parse(req.body);
      const employee = await storage.updateEmployee(req.params.id, data);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      return respondZodError(res, error);
    }
  });

  app.delete("/api/employees/:id", authenticateAccess, async (req, res) => {
    const success = await storage.deleteEmployee(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.status(204).send();
  });

  // Services routes
  app.get("/api/services", authenticateAccess, async (req, res) => {
    const services = await storage.getServices();
    res.json(services);
  });

  app.post("/api/services", authenticateAccess, async (req, res) => {
    try {
      const data = insertServiceSchema.parse(req.body);
      const service = await storage.createService(data);
      res.status(201).json(service);
    } catch (error) {
      return respondZodError(res, error);
    }
  });

  app.get("/api/services/:id", authenticateAccess, async (req, res) => {
    const service = await storage.getService(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }
    res.json(service);
  });

  app.put("/api/services/:id", authenticateAccess, async (req, res) => {
    try {
      const data = insertServiceSchema.partial().parse(req.body);
      const service = await storage.updateService(req.params.id, data);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      return respondZodError(res, error);
    }
  });

  app.delete("/api/services/:id", authenticateAccess, async (req, res) => {
    const success = await storage.deleteService(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Service not found" });
    }
    res.status(204).send();
  });

  // Appointments routes
  app.get("/api/appointments", authenticateAccess, async (req, res) => {
    const appointments = await storage.getAppointments();
    res.json(appointments);
  });

  app.post("/api/appointments", authenticateAccess, async (req, res) => {
    try {
      const data = insertAppointmentSchema.parse(req.body);
      const appointment = await storage.createAppointment(data);
      res.status(201).json(appointment);
    } catch (error) {
      return respondZodError(res, error);
    }
  });

  app.get("/api/appointments/:id", authenticateAccess, async (req, res) => {
    const appointment = await storage.getAppointment(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    res.json(appointment);
  });

  app.put("/api/appointments/:id", authenticateAccess, async (req, res) => {
    try {
      const data = insertAppointmentSchema.partial().parse(req.body);
      const appointment = await storage.updateAppointment(req.params.id, data);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      res.json(appointment);
    } catch (error) {
      return respondZodError(res, error);
    }
  });

  app.delete("/api/appointments/:id", authenticateAccess, async (req, res) => {
    const success = await storage.deleteAppointment(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    res.status(204).send();
  });

  // Payments routes
  app.get("/api/payments", authenticateAccess, async (req, res) => {
    const payments = await storage.getPayments();
    res.json(payments);
  });

  app.post("/api/payments", authenticateAccess, async (req, res) => {
    try {
      const data = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(data);
      res.status(201).json(payment);
    } catch (error) {
      return respondZodError(res, error);
    }
  });

  // Inventory routes
  app.get("/api/inventory", authenticateAccess, async (req, res) => {
    const inventory = await storage.getInventory();
    res.json(inventory);
  });

  app.post("/api/inventory", authenticateAccess, async (req, res) => {
    try {
      const data = insertInventorySchema.parse(req.body);
      const item = await storage.createInventoryItem(data);
      res.status(201).json(item);
    } catch (error) {
      return respondZodError(res, error);
    }
  });

  app.get("/api/inventory/:id", authenticateAccess, async (req, res) => {
    const item = await storage.getInventoryItem(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }
    res.json(item);
  });

  app.put("/api/inventory/:id", authenticateAccess, async (req, res) => {
    try {
      const data = insertInventorySchema.partial().parse(req.body);
      const item = await storage.updateInventoryItem(req.params.id, data);
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(item);
    } catch (error) {
      return respondZodError(res, error);
    }
  });

  app.delete("/api/inventory/:id", authenticateAccess, async (req, res) => {
    const success = await storage.deleteInventoryItem(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Inventory item not found" });
    }
    res.status(204).send();
  });

  const httpServer = createServer(app);
  return httpServer;
}
