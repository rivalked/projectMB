import bcrypt from "bcrypt";
import { and, desc, eq } from "drizzle-orm";
import { createDb, type DbClient } from "./db";
import type {
  IStorage,
} from "./storage";
import {
  users,
  branches,
  clients,
  employees,
  services,
  appointments,
  payments,
  inventory,
  type User,
  type InsertUser,
  type Branch,
  type InsertBranch,
  type Client,
  type InsertClient,
  type Employee,
  type InsertEmployee,
  type Service,
  type InsertService,
  type Appointment,
  type InsertAppointment,
  type Payment,
  type InsertPayment,
  type Inventory,
  type InsertInventory,
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
    // Ensure default admin user exists
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
      })
      .returning();
    return row as User;
  }

  // Branches
  async getBranches(): Promise<Branch[]> {
    return await this.db.select().from(branches).orderBy(desc(branches.createdAt));
  }
  async getBranch(id: string): Promise<Branch | undefined> {
    const rows = await this.db.select().from(branches).where(eq(branches.id, id)).limit(1);
    return rows[0];
  }
  async createBranch(insertBranch: InsertBranch): Promise<Branch> {
    const [row] = await this.db
      .insert(branches)
      .values({
        name: insertBranch.name,
        address: insertBranch.address,
        phone: insertBranch.phone ?? null,
      })
      .returning();
    return row as Branch;
  }
  async updateBranch(id: string, data: Partial<InsertBranch>): Promise<Branch | undefined> {
    const [row] = await this.db
      .update(branches)
      .set(compact({ name: data.name, address: data.address, phone: data.phone }))
      .where(eq(branches.id, id))
      .returning();
    return row as Branch | undefined;
  }
  async deleteBranch(id: string): Promise<boolean> {
    const res = await this.db.delete(branches).where(eq(branches.id, id));
    return (res.rowCount ?? 0) > 0;
  }

  // Clients
  async getClients(): Promise<Client[]> {
    return await this.db.select().from(clients).orderBy(desc(clients.createdAt));
  }
  async getClient(id: string): Promise<Client | undefined> {
    const rows = await this.db.select().from(clients).where(eq(clients.id, id)).limit(1);
    return rows[0];
  }
  async createClient(insertClient: InsertClient): Promise<Client> {
    const [row] = await this.db
      .insert(clients)
      .values({
        name: insertClient.name,
        phone: insertClient.phone,
        email: insertClient.email ?? null,
        bonusPoints: insertClient.bonusPoints ?? 0,
      })
      .returning();
    return row as Client;
  }
  async updateClient(id: string, data: Partial<InsertClient>): Promise<Client | undefined> {
    const [row] = await this.db
      .update(clients)
      .set(compact({ name: data.name, phone: data.phone, email: data.email ?? null, bonusPoints: data.bonusPoints }))
      .where(eq(clients.id, id))
      .returning();
    return row as Client | undefined;
  }
  async deleteClient(id: string): Promise<boolean> {
    const res = await this.db.delete(clients).where(eq(clients.id, id));
    return (res.rowCount ?? 0) > 0;
  }

  // Employees
  async getEmployees(): Promise<Employee[]> {
    return await this.db.select().from(employees).orderBy(desc(employees.createdAt));
  }
  async getEmployee(id: string): Promise<Employee | undefined> {
    const rows = await this.db.select().from(employees).where(eq(employees.id, id)).limit(1);
    return rows[0];
  }
  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> {
    const [row] = await this.db
      .insert(employees)
      .values({
        name: insertEmployee.name,
        position: insertEmployee.position,
        phone: insertEmployee.phone ?? null,
        branchId: insertEmployee.branchId ?? null,
        isActive: insertEmployee.isActive ?? true,
      })
      .returning();
    return row as Employee;
  }
  async updateEmployee(id: string, data: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const [row] = await this.db
      .update(employees)
      .set(compact({ name: data.name, position: data.position, phone: data.phone ?? null, branchId: data.branchId ?? null, isActive: data.isActive }))
      .where(eq(employees.id, id))
      .returning();
    return row as Employee | undefined;
  }
  async deleteEmployee(id: string): Promise<boolean> {
    const res = await this.db.delete(employees).where(eq(employees.id, id));
    return (res.rowCount ?? 0) > 0;
  }

  // Services
  async getServices(): Promise<Service[]> {
    return await this.db.select().from(services).orderBy(desc(services.createdAt));
  }
  async getService(id: string): Promise<Service | undefined> {
    const rows = await this.db.select().from(services).where(eq(services.id, id)).limit(1);
    return rows[0];
  }
  async createService(insertService: InsertService): Promise<Service> {
    const [row] = await this.db
      .insert(services)
      .values({
        name: insertService.name,
        description: insertService.description ?? null,
        duration: insertService.duration,
        price: insertService.price,
        category: insertService.category,
        isActive: insertService.isActive ?? true,
      })
      .returning();
    return row as Service;
  }
  async updateService(id: string, data: Partial<InsertService>): Promise<Service | undefined> {
    const [row] = await this.db
      .update(services)
      .set(compact({ name: data.name, description: data.description ?? null, duration: data.duration, price: data.price, category: data.category, isActive: data.isActive }))
      .where(eq(services.id, id))
      .returning();
    return row as Service | undefined;
  }
  async deleteService(id: string): Promise<boolean> {
    const res = await this.db.delete(services).where(eq(services.id, id));
    return (res.rowCount ?? 0) > 0;
  }

  // Appointments
  async getAppointments(): Promise<Appointment[]> {
    return await this.db.select().from(appointments).orderBy(desc(appointments.createdAt));
  }
  async getAppointment(id: string): Promise<Appointment | undefined> {
    const rows = await this.db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
    return rows[0];
  }
  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
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
      })
      .returning();
    return row as Appointment;
  }
  async updateAppointment(id: string, data: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const [row] = await this.db
      .update(appointments)
      .set(compact({ clientId: data.clientId, employeeId: data.employeeId, serviceId: data.serviceId, branchId: data.branchId, appointmentDate: data.appointmentDate, status: data.status, notes: data.notes ?? null }))
      .where(eq(appointments.id, id))
      .returning();
    return row as Appointment | undefined;
  }
  async deleteAppointment(id: string): Promise<boolean> {
    const res = await this.db.delete(appointments).where(eq(appointments.id, id));
    return (res.rowCount ?? 0) > 0;
  }

  // Payments
  async getPayments(): Promise<Payment[]> {
    return await this.db.select().from(payments).orderBy(desc(payments.createdAt));
  }
  async getPayment(id: string): Promise<Payment | undefined> {
    const rows = await this.db.select().from(payments).where(eq(payments.id, id)).limit(1);
    return rows[0];
  }
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const [row] = await this.db
      .insert(payments)
      .values({
        appointmentId: insertPayment.appointmentId ?? null,
        clientId: insertPayment.clientId,
        amount: insertPayment.amount,
        paymentMethod: insertPayment.paymentMethod,
        status: insertPayment.status ?? "completed",
      })
      .returning();
    return row as Payment;
  }

  // Inventory
  async getInventory(): Promise<Inventory[]> {
    return await this.db.select().from(inventory).orderBy(desc(inventory.createdAt));
  }
  async getInventoryItem(id: string): Promise<Inventory | undefined> {
    const rows = await this.db.select().from(inventory).where(eq(inventory.id, id)).limit(1);
    return rows[0];
  }
  async createInventoryItem(insertItem: InsertInventory): Promise<Inventory> {
    const [row] = await this.db
      .insert(inventory)
      .values({
        name: insertItem.name,
        quantity: insertItem.quantity,
        unit: insertItem.unit,
        minQuantity: insertItem.minQuantity ?? 0,
        branchId: insertItem.branchId ?? null,
      })
      .returning();
    return row as Inventory;
  }
  async updateInventoryItem(id: string, data: Partial<InsertInventory>): Promise<Inventory | undefined> {
    const [row] = await this.db
      .update(inventory)
      .set(compact({ name: data.name, quantity: data.quantity, unit: data.unit, minQuantity: data.minQuantity, branchId: data.branchId ?? null }))
      .where(eq(inventory.id, id))
      .returning();
    return row as Inventory | undefined;
  }
  async deleteInventoryItem(id: string): Promise<boolean> {
    const res = await this.db.delete(inventory).where(eq(inventory.id, id));
    return (res.rowCount ?? 0) > 0;
  }
}





