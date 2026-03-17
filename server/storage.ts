import {
  type User, type InsertUser, type Branch, type InsertBranch,
  type Client, type InsertClient, type Employee, type InsertEmployee,
  type Service, type InsertService, type Appointment, type InsertAppointment,
  type Payment, type InsertPayment, type Inventory, type InsertInventory,
  type Tenant, type InsertTenant, type Subscription, type InsertSubscription,
  type Addon, type InsertAddon, type TenantAddon, type Expense, type InsertExpense
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Super Admin Methods
  getTenants(): Promise<Tenant[]>;
  getTenant(id: string): Promise<Tenant | undefined>;
  updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined>;

  getSubscriptions(): Promise<Subscription[]>;
  getAddons(): Promise<Addon[]>;

  getTenantAddons(tenantId: string): Promise<TenantAddon[]>;
  updateTenantAddon(tenantId: string, addonId: string, active: boolean): Promise<TenantAddon | undefined>;

  // Branches
  getBranches(tenantId?: string | null): Promise<Branch[]>;
  getBranch(id: string, tenantId?: string | null): Promise<Branch | undefined>;
  createBranch(tenantId: string | null, branch: InsertBranch): Promise<Branch>;
  updateBranch(id: string, tenantId: string | null, branch: Partial<InsertBranch>): Promise<Branch | undefined>;
  deleteBranch(id: string, tenantId?: string | null): Promise<boolean>;

  // Clients
  getClients(tenantId?: string | null): Promise<Client[]>;
  getClient(id: string, tenantId?: string | null): Promise<Client | undefined>;
  createClient(tenantId: string | null, client: InsertClient): Promise<Client>;
  updateClient(id: string, tenantId: string | null, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string, tenantId?: string | null): Promise<boolean>;

  // Employees
  getEmployees(tenantId?: string | null): Promise<Employee[]>;
  getEmployee(id: string, tenantId?: string | null): Promise<Employee | undefined>;
  createEmployee(tenantId: string | null, employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, tenantId: string | null, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: string, tenantId?: string | null): Promise<boolean>;

  // Services
  getServices(tenantId?: string | null): Promise<Service[]>;
  getService(id: string, tenantId?: string | null): Promise<Service | undefined>;
  createService(tenantId: string | null, service: InsertService): Promise<Service>;
  updateService(id: string, tenantId: string | null, service: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: string, tenantId?: string | null): Promise<boolean>;

  // Appointments
  getAppointments(tenantId?: string | null): Promise<Appointment[]>;
  getAppointment(id: string, tenantId?: string | null): Promise<Appointment | undefined>;
  createAppointment(tenantId: string | null, appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, tenantId: string | null, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: string, tenantId?: string | null): Promise<boolean>;

  // Payments
  getPayments(tenantId?: string | null): Promise<Payment[]>;
  getPayment(id: string, tenantId?: string | null): Promise<Payment | undefined>;
  createPayment(tenantId: string | null, payment: InsertPayment): Promise<Payment>;

  // Inventory
  getInventory(tenantId?: string | null): Promise<Inventory[]>;
  getInventoryItem(id: string, tenantId?: string | null): Promise<Inventory | undefined>;
  createInventoryItem(tenantId: string | null, item: InsertInventory): Promise<Inventory>;
  updateInventoryItem(id: string, tenantId: string | null, item: Partial<InsertInventory>): Promise<Inventory | undefined>;
  deleteInventoryItem(id: string, tenantId?: string | null): Promise<boolean>;

  // Expenses
  getExpenses(tenantId?: string | null): Promise<Expense[]>;
  createExpense(tenantId: string | null, expense: InsertExpense): Promise<Expense>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private branches: Map<string, Branch> = new Map();
  private clients: Map<string, Client> = new Map();
  private employees: Map<string, Employee> = new Map();
  private services: Map<string, Service> = new Map();
  private appointments: Map<string, Appointment> = new Map();
  private payments: Map<string, Payment> = new Map();
  private inventory: Map<string, Inventory> = new Map();
  private expenses: Map<string, Expense> = new Map();

  private tenants: Map<string, Tenant> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private addons: Map<string, Addon> = new Map();
  private tenantAddons: Map<string, TenantAddon> = new Map();

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Create default admin user
    const adminId = randomUUID();
    const hashedPassword = bcrypt.hashSync("admin123", 10);
    this.users.set(adminId, {
      id: adminId,
      email: "admin@salon.ru",
      phone: "+7 (999) 123-45-67",
      password: hashedPassword,
      name: "Анна Петрова",
      role: "admin",
      tenantId: null,
      createdAt: new Date(),
    });

    // Create default branch
    const branchId = randomUUID();
    this.branches.set(branchId, {
      id: branchId,
      name: "Центральный салон",
      address: "ул. Тверская, 15",
      phone: "+7 (495) 123-45-67",
      tenantId: "default",
      createdAt: new Date(),
    });

    // Create default tenant
    this.tenants.set("default", {
      id: "default",
      name: "Мой Салон (демо)",
      businessType: "salon",
      status: "active",
      subscriptionId: null,
      telegramBotToken: null,
      botEnabled: false,
      createdAt: new Date(),
    });
  }

  // Super Admin Methods
  async getTenants(): Promise<Tenant[]> {
    return Array.from(this.tenants.values());
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    return this.tenants.get(id);
  }

  async updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const tenant = this.tenants.get(id);
    if (!tenant) return undefined;
    const updated = { ...tenant, ...data };
    this.tenants.set(id, updated);
    return updated;
  }

  async getSubscriptions(): Promise<Subscription[]> {
    return Array.from(this.subscriptions.values());
  }

  async getAddons(): Promise<Addon[]> {
    return Array.from(this.addons.values());
  }

  async getTenantAddons(tenantId: string): Promise<TenantAddon[]> {
    return Array.from(this.tenantAddons.values()).filter(a => a.tenantId === tenantId);
  }

  async updateTenantAddon(tenantId: string, addonId: string, active: boolean): Promise<TenantAddon | undefined> {
    let existing = Array.from(this.tenantAddons.values()).find(a => a.tenantId === tenantId && a.addonId === addonId);
    if (existing) {
      existing = { ...existing, active };
      this.tenantAddons.set(existing.id, existing);
      return existing;
    }
    const newAddon: TenantAddon = {
      id: randomUUID(),
      tenantId,
      addonId,
      active,
      createdAt: new Date()
    };
    this.tenantAddons.set(newAddon.id, newAddon);
    return newAddon;
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const hashedPassword = bcrypt.hashSync(insertUser.password, 10);
    const user: User = {
      ...insertUser,
      id,
      password: hashedPassword,
      role: insertUser.role || "admin",
      phone: insertUser.phone || null,
      tenantId: insertUser.tenantId || null,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  // Branches
  async getBranches(tenantId?: string | null): Promise<Branch[]> {
    if (tenantId) return Array.from(this.branches.values()).filter(i => i.tenantId === tenantId);
    return Array.from(this.branches.values());
  }

  async getBranch(id: string, tenantId?: string | null): Promise<Branch | undefined> {
    const branch = this.branches.get(id);
    if (!branch) return undefined;
    if (tenantId && branch.tenantId !== tenantId) return undefined;
    return branch;
  }

  async createBranch(tenantId: string | null, insertBranch: InsertBranch): Promise<Branch> {
    const id = randomUUID();
    const branch: Branch = {
      ...insertBranch,
      id,
      phone: insertBranch.phone || null,
      tenantId: tenantId!,
      createdAt: new Date()
    };
    this.branches.set(id, branch);
    return branch;
  }

  async updateBranch(id: string, tenantId: string | null, data: Partial<InsertBranch>): Promise<Branch | undefined> {
    const branch = this.branches.get(id);
    if (!branch) return undefined;
    if (tenantId && branch.tenantId !== tenantId) return undefined;
    const updated = { ...branch, ...data };
    this.branches.set(id, updated);
    return updated;
  }

  async deleteBranch(id: string, tenantId?: string | null): Promise<boolean> {
    const branch = this.branches.get(id);
    if (!branch) return false;
    if (tenantId && branch.tenantId !== tenantId) return false;
    return this.branches.delete(id);
  }

  // Clients
  async getClients(tenantId?: string | null): Promise<Client[]> {
    if (tenantId) return Array.from(this.clients.values()).filter(i => i.tenantId === tenantId);
    return Array.from(this.clients.values());
  }

  async getClient(id: string, tenantId?: string | null): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (tenantId && client?.tenantId !== tenantId) return undefined;
    return client;
  }

  async createClient(tenantId: string | null, insertClient: InsertClient): Promise<Client> {
    const id = randomUUID();
    const client: Client = {
      ...insertClient,
      id,
      email: insertClient.email || null,
      totalVisits: 0,
      bonusPoints: insertClient.bonusPoints || 0,
      lastVisit: null,
      tenantId: tenantId!,
      createdAt: new Date()
    };
    this.clients.set(id, client);
    return client;
  }

  async updateClient(id: string, tenantId: string | null, data: Partial<InsertClient>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;
    if (tenantId && client.tenantId !== tenantId) return undefined;
    const updated = { ...client, ...data };
    this.clients.set(id, updated);
    return updated;
  }

  async deleteClient(id: string, tenantId?: string | null): Promise<boolean> {
    const item = this.clients.get(id);
    if (tenantId && item?.tenantId !== tenantId) return false;
    return this.clients.delete(id);
  }

  // Employees
  async getEmployees(tenantId?: string | null): Promise<Employee[]> {
    if (tenantId) return Array.from(this.employees.values()).filter(i => i.tenantId === tenantId);
    return Array.from(this.employees.values());
  }

  async getEmployee(id: string, tenantId?: string | null): Promise<Employee | undefined> {
    const item = this.employees.get(id);
    if (tenantId && item?.tenantId !== tenantId) return undefined;
    return item;
  }

  async createEmployee(tenantId: string | null, insertEmployee: InsertEmployee): Promise<Employee> {
    const id = randomUUID();
    const employee: Employee = {
      ...insertEmployee,
      id,
      phone: insertEmployee.phone || null,
      branchId: insertEmployee.branchId || null,
      isActive: insertEmployee.isActive !== undefined ? insertEmployee.isActive : true,
      tenantId: tenantId!,
      createdAt: new Date()
    };
    this.employees.set(id, employee);
    return employee;
  }

  async updateEmployee(id: string, tenantId: string | null, data: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const item = this.employees.get(id);
    if (!item) return undefined;
    if (tenantId && item.tenantId !== tenantId) return undefined;
    const updated = { ...item, ...data };
    this.employees.set(id, updated);
    return updated;
  }

  async deleteEmployee(id: string, tenantId?: string | null): Promise<boolean> {
    const item = this.employees.get(id);
    if (tenantId && item?.tenantId !== tenantId) return false;
    return this.employees.delete(id);
  }

  // Services
  async getServices(tenantId?: string | null): Promise<Service[]> {
    if (tenantId) return Array.from(this.services.values()).filter(i => i.tenantId === tenantId);
    return Array.from(this.services.values());
  }

  async getService(id: string, tenantId?: string | null): Promise<Service | undefined> {
    const item = this.services.get(id);
    if (tenantId && item?.tenantId !== tenantId) return undefined;
    return item;
  }

  async createService(tenantId: string | null, insertService: InsertService): Promise<Service> {
    const id = randomUUID();
    const service: Service = {
      ...insertService,
      id,
      description: insertService.description || null,
      isActive: insertService.isActive !== undefined ? insertService.isActive : true,
      tenantId: tenantId!,
      createdAt: new Date(),
      costPrice: insertService.costPrice || "0",
      marginRules: {},
    };
    this.services.set(id, service);
    return service;
  }

  async updateService(id: string, tenantId: string | null, data: Partial<InsertService>): Promise<Service | undefined> {
    const item = this.services.get(id);
    if (!item) return undefined;
    if (tenantId && item.tenantId !== tenantId) return undefined;
    const updated = { ...item, ...data };
    this.services.set(id, updated);
    return updated;
  }

  async deleteService(id: string, tenantId?: string | null): Promise<boolean> {
    const item = this.services.get(id);
    if (tenantId && item?.tenantId !== tenantId) return false;
    return this.services.delete(id);
  }

  // Appointments
  async getAppointments(tenantId?: string | null): Promise<Appointment[]> {
    if (tenantId) return Array.from(this.appointments.values()).filter(i => i.tenantId === tenantId);
    return Array.from(this.appointments.values());
  }

  async getAppointment(id: string, tenantId?: string | null): Promise<Appointment | undefined> {
    const item = this.appointments.get(id);
    if (tenantId && item?.tenantId !== tenantId) return undefined;
    return item;
  }

  async createAppointment(tenantId: string | null, insertAppointment: InsertAppointment): Promise<Appointment> {
    const id = randomUUID();
    const appointment: Appointment = {
      ...insertAppointment,
      id,
      notes: insertAppointment.notes || null,
      status: insertAppointment.status || "scheduled",
      tenantId: tenantId!,
      createdAt: new Date()
    };
    this.appointments.set(id, appointment);
    return appointment;
  }

  async updateAppointment(id: string, tenantId: string | null, data: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const item = this.appointments.get(id);
    if (!item) return undefined;
    if (tenantId && item.tenantId !== tenantId) return undefined;
    const updated = { ...item, ...data };
    this.appointments.set(id, updated);
    return updated;
  }

  async deleteAppointment(id: string, tenantId?: string | null): Promise<boolean> {
    const item = this.appointments.get(id);
    if (tenantId && item?.tenantId !== tenantId) return false;
    return this.appointments.delete(id);
  }

  // Payments
  async getPayments(tenantId?: string | null): Promise<Payment[]> {
    if (tenantId) return Array.from(this.payments.values()).filter(i => i.tenantId === tenantId);
    return Array.from(this.payments.values());
  }

  async getPayment(id: string, tenantId?: string | null): Promise<Payment | undefined> {
    const item = this.payments.get(id);
    if (tenantId && item?.tenantId !== tenantId) return undefined;
    return item;
  }

  async createPayment(tenantId: string | null, insertPayment: InsertPayment): Promise<Payment> {
    const id = randomUUID();
    const payment: Payment = {
      ...insertPayment,
      id,
      appointmentId: insertPayment.appointmentId || null,
      status: insertPayment.status || "completed",
      tenantId: tenantId!,
      createdAt: new Date()
    };
    this.payments.set(id, payment);
    return payment;
  }

  // Inventory
  async getInventory(tenantId?: string | null): Promise<Inventory[]> {
    if (tenantId) return Array.from(this.inventory.values()).filter(i => i.tenantId === tenantId);
    return Array.from(this.inventory.values());
  }

  async getInventoryItem(id: string, tenantId?: string | null): Promise<Inventory | undefined> {
    const item = this.inventory.get(id);
    if (tenantId && item?.tenantId !== tenantId) return undefined;
    return item;
  }

  async createInventoryItem(tenantId: string | null, insertItem: InsertInventory): Promise<Inventory> {
    const id = randomUUID();
    const item: Inventory = {
      ...insertItem,
      id,
      branchId: insertItem.branchId || null,
      minQuantity: insertItem.minQuantity || 0,
      tenantId: tenantId!,
      createdAt: new Date(),
      costPrice: insertItem.costPrice || "0",
      marginRules: {},
    };
    this.inventory.set(id, item);
    return item;
  }

  async updateInventoryItem(id: string, tenantId: string | null, data: Partial<InsertInventory>): Promise<Inventory | undefined> {
    const item = this.inventory.get(id);
    if (!item) return undefined;
    if (tenantId && item.tenantId !== tenantId) return undefined;
    const updated = { ...item, ...data };
    this.inventory.set(id, updated);
    return updated;
  }

  async deleteInventoryItem(id: string, tenantId?: string | null): Promise<boolean> {
    const item = this.inventory.get(id);
    if (tenantId && item?.tenantId !== tenantId) return false;
    return this.inventory.delete(id);
  }

  // Expenses
  async getExpenses(tenantId?: string | null): Promise<Expense[]> {
    if (tenantId) return Array.from(this.expenses.values()).filter(i => i.tenantId === tenantId);
    return Array.from(this.expenses.values());
  }

  async createExpense(tenantId: string | null, insertExpense: InsertExpense): Promise<Expense> {
    const id = randomUUID();
    const expense: Expense = {
      ...insertExpense,
      id,
      description: insertExpense.description || null,
      tenantId: tenantId!,
      createdAt: new Date()
    };
    this.expenses.set(id, expense);
    return expense;
  }
}

import { DBStorage } from "./storage-db";

function createStorage() {
  if (process.env.DATABASE_URL) {
    const dbStore = new DBStorage();
    // fire-and-forget seed
    void dbStore.seed();
    return dbStore as IStorage;
  }
  return new MemStorage();
}

export const storage = createStorage();
