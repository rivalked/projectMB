import { and, eq, gt, isNull } from "drizzle-orm";
import { type DbClient } from "./db";
import { refreshTokens } from "@shared/schema";

export interface RefreshStore {
  add(jti: string, userId: string, expiresAt: Date): Promise<void>;
  revoke(jti: string): Promise<void>;
  isValid(jti: string): Promise<boolean>;
}

export class DbRefreshStore implements RefreshStore {
  constructor(private db: DbClient) {}

  async add(jti: string, userId: string, expiresAt: Date) {
    await this.db.insert(refreshTokens).values({ jti, userId, expiresAt });
  }

  async revoke(jti: string) {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.jti, jti));
  }

  async isValid(jti: string) {
    const rows = await this.db
      .select({ jti: refreshTokens.jti })
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.jti, jti),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }
}

export class MemoryRefreshStore implements RefreshStore {
  private valid = new Set<string>();
  private exp = new Map<string, number>();

  async add(jti: string, _userId: string, expiresAt: Date) {
    this.valid.add(jti);
    this.exp.set(jti, expiresAt.getTime());
  }
  async revoke(jti: string) {
    this.valid.delete(jti);
    this.exp.delete(jti);
  }
  async isValid(jti: string) {
    if (!this.valid.has(jti)) return false;
    const e = this.exp.get(jti);
    if (!e) return false;
    if (Date.now() > e) {
      this.valid.delete(jti);
      this.exp.delete(jti);
      return false;
    }
    return true;
  }
}

export function createRefreshStore(db?: DbClient): RefreshStore {
  if (db) return new DbRefreshStore(db);
  return new MemoryRefreshStore();
}





