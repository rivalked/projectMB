import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Branches table
export const branches = pgTable("branches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Clients table
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  bonusPoints: integer("bonus_points").default(0),
  totalVisits: integer("total_visits").default(0),
  lastVisit: timestamp("last_visit"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Employees table
export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  position: text("position").notNull(),
  phone: text("phone"),
  branchId: varchar("branch_id").references(() => branches.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Services table
export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  duration: integer("duration").notNull(), // in minutes
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Appointments table
export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  employeeId: varchar("employee_id").references(() => employees.id).notNull(),
  serviceId: varchar("service_id").references(() => services.id).notNull(),
  branchId: varchar("branch_id").references(() => branches.id).notNull(),
  appointmentDate: timestamp("appointment_date").notNull(),
  status: text("status").notNull().default("scheduled"), // scheduled, completed, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payments table
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(), // cash, card, online
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Inventory table
export const inventory = pgTable("inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull(),
  unit: text("unit").notNull(),
  minQuantity: integer("min_quantity").default(0),
  branchId: varchar("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Refresh tokens table (for persistent allowlist)
export const refreshTokens = pgTable("refresh_tokens", {
  jti: varchar("jti").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertBranchSchema = createInsertSchema(branches, {
  name: z.string().trim().min(1, "name required"),
  address: z.string().trim().min(1, "address required"),
  phone: z.string().trim().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertClientSchema = createInsertSchema(clients, {
  name: z.string().trim().min(1, "name required"),
  phone: z.string().trim().min(1, "phone required"),
  email: z.string().email().optional().or(z.literal("")).transform(v => v || undefined),
}).omit({
  id: true,
  createdAt: true,
  totalVisits: true,
  lastVisit: true,
});

export const insertEmployeeSchema = createInsertSchema(employees, {
  name: z.string().trim().min(1, "name required"),
  position: z.string().trim().min(1, "position required"),
  phone: z.string().trim().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertServiceSchema = createInsertSchema(services, {
  name: z.string().trim().min(1, "name required"),
  description: z.string().trim().optional(),
  duration: z.number().int().positive("duration must be > 0"),
  price: z.string().regex(/^\d+(?:\.\d{1,2})?$/, "invalid price"),
  category: z.string().trim().min(1, "category required"),
  isActive: z.boolean().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments, {
  appointmentDate: z.coerce.date(),
  status: z.enum(["scheduled", "completed", "cancelled"]).default("scheduled"),
}).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments, {
  amount: z.string().regex(/^\d+(?:\.\d{1,2})?$/, "invalid amount"),
  paymentMethod: z.enum(["cash", "card", "online"]).default("card"),
  status: z.enum(["completed", "pending", "failed"]).default("completed"),
}).omit({
  id: true,
  createdAt: true,
}).superRefine((val, ctx) => {
  if (val.status === "completed" && !val.appointmentId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["appointmentId"],
      message: "appointmentId required when status is completed",
    });
  }
});

const allowedUnits = [
  "шт", "мл", "л", "г", "кг", "упаковка", "тюбик", "флакон",
] as const;

export const insertInventorySchema = createInsertSchema(inventory, {
  name: z.string().trim().min(1, "name required"),
  quantity: z.number().int().nonnegative(),
  unit: z.enum(allowedUnits),
  minQuantity: z.number().int().nonnegative().optional().default(0),
  branchId: z.string().trim().optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
});

// Login schema
export const loginSchema = z.object({
  email: z.string().min(1, "Email or phone is required"),
  password: z.string().min(1, "Password is required"),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Branch = typeof branches.$inferSelect;
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type RefreshTokenRow = typeof refreshTokens.$inferSelect;
