/**
 * Run once on startup to make sure all hardcoded admin accounts exist in the DB.
 * Safe to run multiple times — skips accounts that are already created.
 *
 * Usage: npx tsx scripts/seed-admins.ts
 * Or automatically via the "predev" npm script.
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config(); // fallback to .env
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../app/generated/prisma/client";
import bcrypt from "bcryptjs";
import { ADMIN_EMAILS } from "../lib/admins";

async function main() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const adapter = new PrismaLibSql({ url });
  const prisma = new PrismaClient({ adapter });

  const password = process.env.ADMIN_PASSWORD ?? "change-me-now";
  const hash = await bcrypt.hash(password, 10);

  for (const email of ADMIN_EMAILS) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`✓ Admin already exists: ${email}`);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: email.split("@")[0],
        emailVerified: true,
      },
    });

    // Create the credential account (Better Auth stores passwords here)
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: hash,
      },
    });

    console.log(`✅ Created admin account: ${email} / ${password}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
