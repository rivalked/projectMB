import bcrypt from "bcrypt";
import { and, desc, eq } from "drizzle-orm";
import { createDb, type DbClient } from "./db";
import type { IStorage } from "./storage";
import {
  users, branches, clients, employees, services, appointments, payments, inventory,
  tenants, subscriptions, addons, tenantAddons, expenses,
  type User, type InsertUser, type Branch, type InsertBranch, type Client, type InsertClient,
  type Employee, type InsertEmployee, type Service, type InsertService, type Appointment, type InsertAppointment,
  type Payment, type InsertPayment, type Inventory, type InsertInventory,
  type Tenant, type InsertTenant, type Subscription, type InsertSubscription,
  type Addon, type InsertAddon, type TenantAddon, type Expense, type InsertExpense
} from "@shared/schema";

function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (out as any)[k] = v;
  }
  return out;
}

export class DBStorage implements IStorage {
  private db: DbClient;

  constructor(db?: DbClient) {
    this.db = db ?? createDb();
  }

  async seed() {
    const existing = await this.db.select().from(users).where(eq(users.email, "admin@salon.ru")).limit(1);
    if (existing.length === 0) {
      const hashedPassword = bcrypt.hashSync("admin123", 10);
      await this.db.insert(users).values({
        email: "admin@salon.ru",
        phone: "+7 (999) 123-45-67",
        password: hashedPassword,
        name: "Анна Петрова",
        role: "admin",
      });
    }
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0];
  }
  async getUserByEmail(email: string): Promise<User | undefined> {
    const rows = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return rows[0];
  }
  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = bcrypt.hashSync(insertUser.password, 10);
    const [row] = await this.db
      .insert(users)
      .values({
        email: insertUser.email,
        phone: insertUser.phone ?? null,
        password: hashedPassword,
        name: insertUser.name,
        role: insertUser.role ?? "admin",
        tenantId: insertUser.tenantId ?? null,
      })
      .returning();
    return row as User;
  }

  // Super Admin Methods
  async getTenants(): Promise<Tenant[]> {
    return await this.db.select().from(tenants).orderBy(desc(tenants.createdAt));
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    const rows = await this.db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    return rows[0];
  }

  async updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const [row] = await this.db
      .update(tenants)
      .set(compact({
        name: data.name,
        businessType: data.businessType,
        status: data.status,
        subscriptionId: data.subscriptionId ?? null
      }))
      .where(eq(tenants.id, id))
      .returning();
    return row as Tenant | undefined;
  }

  async getSubscriptions(): Promise<Subscription[]> {
    return await this.db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
  }

  async getAddons(): Promise<Addon[]> {
    return await this.db.select().from(addons).orderBy(desc(addons.createdAt));
  }

  async getTenantAddons(tenantId: string): Promise<TenantAddon[]> {
    return await this.db.select().from(tenantAddons).where(eq(tenantAddons.tenantId, tenantId)).orderBy(desc(tenantAddons.createdAt));
  }

  async updateTenantAddon(tenantId: string, addonId: string, active: boolean): Promise<TenantAddon | undefined> {
    const existing = await this.db.select().from(tenantAddons).where(and(eq(tenantAddons.tenantId, tenantId), eq(tenantAddons.addonId, addonId))).limit(1);
    if (existing.length > 0) {
      const [row] = await this.db.update(tenantAddons).set({ active }).where(eq(tenantAddons.id, existing[0].id)).returning();
      return row as TenantAddon;
    }
    const [inserted] = await this.db.insert(tenantAddons).values({
      tenantId,
      addonId,
      active
    }).returning();
    return inserted as TenantAddon;
  }

  // Branches
  async getBranches(tenantId?: string | null): Promise<Branch[]> {
    if (tenantId) return await this.db.select().from(branches).where(eq(branches.tenantId, tenantId)).orderBy(desc(branches.createdAt));
    return await this.db.select().from(branches).orderBy(desc(branches.createdAt));
  }
  async getBranch(id: string, tenantId?: string | null): Promise<Branch | undefined> {
    if (tenantId) {
      const rows = await this.db.select().from(branches).where(and(eq(branches.id, id), eq(branches.tenantId, tenantId))).limit(1);
      return rows[0];
    }
    const rows = await this.db.select().from(branches).where(eq(branches.id, id)).limit(1);
    return rows[0];
  }
  async createBranch(tenantId: string | null, insertBranch: InsertBranch): Promise<Branch> {
    const [row] = await this.db
      .insert(branches)
      .values({
        name: insertBranch.name,
        address: insertBranch.address,
        phone: insertBranch.phone ?? null,
        tenantId: tenantId!,
      })
      .returning();
    return row as Branch;
  }
  async updateBranch(id: string, tenantId: string | null, data: Partial<InsertBranch>): Promise<Branch | undefined> {
    let q = this.db.update(branches).set(compact({ name: data.name, address: data.address, phone: data.phone }));
    if (tenantId) q = q.where(and(eq(branches.id, id), eq(branches.tenantId, tenantId))) as any;
    else q = q.where(eq(branches.id, id)) as any;
    const [row] = await q.returning();
    return row as Branch | undefined;
  }
  async deleteBranch(id: string, tenantId?: string | null): Promise<boolean> {
    let q = this.db.delete(branches);
    if (tenantId) q = q.where(and(eq(branches.id, id), eq(branches.tenantId, tenantId))) as any;
    else q = q.where(eq(branches.id, id)) as any;
    const res = await q;
    return (res.rowCount ?? 0) > 0;
  }

  // Clients
  async getClients(tenantId?: string | null): Promise<Client[]> {
    if (tenantId) return await this.db.select().from(clients).where(eq(clients.tenantId, tenantId)).orderBy(desc(clients.createdAt));
    return await this.db.select().from(clients).orderBy(desc(clients.createdAt));
  }
  async getClient(id: string, tenantId?: string | null): Promise<Client | undefined> {
    if (tenantId) {
      const rows = await this.db.select().from(clients).where(and(eq(clients.id, id), eq(clients.tenantId, tenantId))).limit(1);
      return rows[0];
    }
    const rows = await this.db.select().from(clients).where(eq(clients.id, id)).limit(1);
    return rows[0];
  }
  async createClient(tenantId: string | null, insertClient: InsertClient): Promise<Client> {
    const [row] = await this.db
      .insert(clients)
      .values({
        name: insertClient.name,
        phone: insertClient.phone,
        email: insertClient.email ?? null,
        bonusPoints: insertClient.bonusPoints ?? 0,
        tenantId: tenantId!,
      })
      .returning();
    return row as Client;
  }
  async updateClient(id: string, tenantId: string | null, data: Partial<InsertClient>): Promise<Client | undefined> {
    let q = this.db.update(clients).set(compact({ name: data.name, phone: data.phone, email: data.email ?? null, bonusPoints: data.bonusPoints }));
    if (tenantId) q = q.where(and(eq(clients.id, id), eq(clients.tenantId, tenantId))) as any;
    else q = q.where(eq(clients.id, id)) as any;
    const [row] = await q.returning();
    return row as Client | undefined;
  }
  async deleteClient(id: string, tenantId?: string | null): Promise<boolean> {
    let q = this.db.delete(clients);
    if (tenantId) q = q.where(and(eq(clients.id, id), eq(clients.tenantId, tenantId))) as any;
    else q = q.where(eq(clients.id, id)) as any;
    const res = await q;
    return (res.rowCount ?? 0) > 0;
  }

  // Employees
  async getEmployees(tenantId?: string | null): Promise<Employee[]> {
    if (tenantId) return await this.db.select().from(employees).where(eq(employees.tenantId, tenantId)).orderBy(desc(employees.createdAt));
    return await this.db.select().from(employees).orderBy(desc(employees.createdAt));
  }
  async getEmployee(id: string, tenantId?: string | null): Promise<Employee | undefined> {
    if (tenantId) {
      const rows = await this.db.select().from(employees).where(and(eq(employees.id, id), eq(employees.tenantId, tenantId))).limit(1);
      return rows[0];
    }
    const rows = await this.db.select().from(employees).where(eq(employees.id, id)).limit(1);
    return rows[0];
  }
  async createEmployee(tenantId: string | null, insertEmployee: InsertEmployee): Promise<Employee> {
    const [row] = await this.db
      .insert(employees)
      .values({
        name: insertEmployee.name,
        position: insertEmployee.position,
        phone: insertEmployee.phone ?? null,
        branchId: insertEmployee.branchId ?? null,
        isActive: insertEmployee.isActive ?? true,
        tenantId: tenantId!,
      })
      .returning();
    return row as Employee;
  }
  async updateEmployee(id: string, tenantId: string | null, data: Partial<InsertEmployee>): Promise<Employee | undefined> {
    let q = this.db.update(employees).set(compact({ name: data.name, position: data.position, phone: data.phone ?? null, branchId: data.branchId ?? null, isActive: data.isActive }));
    if (tenantId) q = q.where(and(eq(employees.id, id), eq(employees.tenantId, tenantId))) as any;
    else q = q.where(eq(employees.id, id)) as any;
    const [row] = await q.returning();
    return row as Employee | undefined;
  }
  async deleteEmployee(id: string, tenantId?: string | null): Promise<boolean> {
    let q = this.db.delete(employees);
    if (tenantId) q = q.where(and(eq(employees.id, id), eq(employees.tenantId, tenantId))) as any;
    else q = q.where(eq(employees.id, id)) as any;
    const res = await q;
    return (res.rowCount ?? 0) > 0;
  }

  // Services
  async getServices(tenantId?: string | null): Promise<Service[]> {
    if (tenantId) return await this.db.select().from(services).where(eq(services.tenantId, tenantId)).orderBy(desc(services.createdAt));
    return await this.db.select().from(services).orderBy(desc(services.createdAt));
  }
  async getService(id: string, tenantId?: string | null): Promise<Service | undefined> {
    if (tenantId) {
      const rows = await this.db.select().from(services).where(and(eq(services.id, id), eq(services.tenantId, tenantId))).limit(1);
      return rows[0];
    }
    const rows = await this.db.select().from(services).where(eq(services.id, id)).limit(1);
    return rows[0];
  }
  async createService(tenantId: string | null, insertService: InsertService): Promise<Service> {
    const [row] = await this.db
      .insert(services)
      .values({
        name: insertService.name,
        description: insertService.description ?? null,
        duration: insertService.duration,
        price: insertService.price,
        category: insertService.category,
        isActive: insertService.isActive ?? true,
        tenantId: tenantId!,
      })
      .returning();
    return row as Service;
  }
  async updateService(id: string, tenantId: string | null, data: Partial<InsertService>): Promise<Service | undefined> {
    let q = this.db.update(services).set(compact({ name: data.name, description: data.description ?? null, duration: data.duration, price: data.price, category: data.category, isActive: data.isActive }));
    if (tenantId) q = q.where(and(eq(services.id, id), eq(services.tenantId, tenantId))) as any;
    else q = q.where(eq(services.id, id)) as any;
    const [row] = await q.returning();
    return row as Service | undefined;
  }
  async deleteService(id: string, tenantId?: string | null): Promise<boolean> {
    let q = this.db.delete(services);
    if (tenantId) q = q.where(and(eq(services.id, id), eq(services.tenantId, tenantId))) as any;
    else q = q.where(eq(services.id, id)) as any;
    const res = await q;
    return (res.rowCount ?? 0) > 0;
  }

  // Appointments
  async getAppointments(tenantId?: string | null): Promise<Appointment[]> {
    if (tenantId) return await this.db.select().from(appointments).where(eq(appointments.tenantId, tenantId)).orderBy(desc(appointments.createdAt));
    return await this.db.select().from(appointments).orderBy(desc(appointments.createdAt));
  }
  async getAppointment(id: string, tenantId?: string | null): Promise<Appointment | undefined> {
    if (tenantId) {
      const rows = await this.db.select().from(appointments).where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId))).limit(1);
      return rows[0];
    }
    const rows = await this.db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
    return rows[0];
  }
  async createAppointment(tenantId: string | null, insertAppointment: InsertAppointment): Promise<Appointment> {
    const [row] = await this.db
      .insert(appointments)
      .values({
        clientId: insertAppointment.clientId,
        employeeId: insertAppointment.employeeId,
        serviceId: insertAppointment.serviceId,
        branchId: insertAppointment.branchId,
        appointmentDate: insertAppointment.appointmentDate,
        status: insertAppointment.status ?? "scheduled",
        notes: insertAppointment.notes ?? null,
        tenantId: tenantId!,
      })
      .returning();
    return row as Appointment;
  }
  async updateAppointment(id: string, tenantId: string | null, data: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    let q = this.db.update(appointments).set(compact({ clientId: data.clientId, employeeId: data.employeeId, serviceId: data.serviceId, branchId: data.branchId, appointmentDate: data.appointmentDate, status: data.status, notes: data.notes ?? null }));
    if (tenantId) q = q.where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId))) as any;
    else q = q.where(eq(appointments.id, id)) as any;
    const [row] = await q.returning();
    return row as Appointment | undefined;
  }
  async deleteAppointment(id: string, tenantId?: string | null): Promise<boolean> {
    let q = this.db.delete(appointments);
    if (tenantId) q = q.where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId))) as any;
    else q = q.where(eq(appointments.id, id)) as any;
    const res = await q;
    return (res.rowCount ?? 0) > 0;
  }

  // Payments
  async getPayments(tenantId?: string | null): Promise<Payment[]> {
    if (tenantId) return await this.db.select().from(payments).where(eq(payments.tenantId, tenantId)).orderBy(desc(payments.createdAt));
    return await this.db.select().from(payments).orderBy(desc(payments.createdAt));
  }
  async getPayment(id: string, tenantId?: string | null): Promise<Payment | undefined> {
    if (tenantId) {
      const rows = await this.db.select().from(payments).where(and(eq(payments.id, id), eq(payments.tenantId, tenantId))).limit(1);
      return rows[0];
    }
    const rows = await this.db.select().from(payments).where(eq(payments.id, id)).limit(1);
    return rows[0];
  }
  async createPayment(tenantId: string | null, insertPayment: InsertPayment): Promise<Payment> {
    const [row] = await this.db
      .insert(payments)
      .values({
        appointmentId: insertPayment.appointmentId ?? null,
        clientId: insertPayment.clientId,
        amount: insertPayment.amount,
        paymentMethod: insertPayment.paymentMethod,
        status: insertPayment.status ?? "completed",
        tenantId: tenantId!,
      })
      .returning();
    return row as Payment;
  }

  // Inventory
  async getInventory(tenantId?: string | null): Promise<Inventory[]> {
    if (tenantId) return await this.db.select().from(inventory).where(eq(inventory.tenantId, tenantId)).orderBy(desc(inventory.createdAt));
    return await this.db.select().from(inventory).orderBy(desc(inventory.createdAt));
  }
  async getInventoryItem(id: string, tenantId?: string | null): Promise<Inventory | undefined> {
    if (tenantId) {
      const rows = await this.db.select().from(inventory).where(and(eq(inventory.id, id), eq(inventory.tenantId, tenantId))).limit(1);
      return rows[0];
    }
    const rows = await this.db.select().from(inventory).where(eq(inventory.id, id)).limit(1);
    return rows[0];
  }
  async createInventoryItem(tenantId: string | null, insertItem: InsertInventory): Promise<Inventory> {
    const [row] = await this.db
      .insert(inventory)
      .values({
        name: insertItem.name,
        quantity: insertItem.quantity,
        unit: insertItem.unit,
        minQuantity: insertItem.minQuantity ?? 0,
        branchId: insertItem.branchId ?? null,
        category: insertItem.category ?? 'general',
        tenantId: tenantId!,
      })
      .returning();
    return row as Inventory;
  }

  async updateInventoryItem(id: string, tenantId: string | null, data: Partial<InsertInventory>): Promise<Inventory | undefined> {
    let q = this.db.update(inventory).set(compact({ name: data.name, quantity: data.quantity, unit: data.unit, minQuantity: data.minQuantity, branchId: data.branchId ?? null }));
    if (tenantId) q = q.where(and(eq(inventory.id, id), eq(inventory.tenantId, tenantId))) as any;
    else q = q.where(eq(inventory.id, id)) as any;
    const [row] = await q.returning();
    return row as Inventory | undefined;
  }
  async deleteInventoryItem(id: string, tenantId?: string | null): Promise<boolean> {
    let q = this.db.delete(inventory);
    if (tenantId) q = q.where(and(eq(inventory.id, id), eq(inventory.tenantId, tenantId))) as any;
    else q = q.where(eq(inventory.id, id)) as any;
    const res = await q;
    return (res.rowCount ?? 0) > 0;
  }

  // Expenses
  async getExpenses(tenantId?: string | null): Promise<Expense[]> {
    if (tenantId) return await this.db.select().from(expenses).where(eq(expenses.tenantId, tenantId)).orderBy(desc(expenses.createdAt));
    return await this.db.select().from(expenses).orderBy(desc(expenses.createdAt));
  }

  async createExpense(tenantId: string | null, insertExpense: InsertExpense): Promise<Expense> {
    const [row] = await this.db
      .insert(expenses)
      .values({
        amount: insertExpense.amount,
        category: insertExpense.category,
        date: insertExpense.date,
        description: insertExpense.description ?? null,
        tenantId: tenantId!,
      })
      .returning();
    return row as Expense;
  }
}
