import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

function createPrisma() {
  // On Vercel only /tmp is writable; locally use ./dev.db
  const defaultUrl =
    process.env.VERCEL ? "file:///tmp/radar.db" : "file:./dev.db";
  const url = process.env.DATABASE_URL ?? defaultUrl;
  const adapter = new PrismaLibSql({ url });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
