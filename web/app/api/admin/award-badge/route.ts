import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admins";
import { BADGE_MAP } from "@/lib/badges";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, badgeId } = await req.json();
  if (!userId || !badgeId || !BADGE_MAP[badgeId]) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await prisma.userBadge.upsert({
    where: { userId_badgeId: { userId, badgeId } },
    create: { userId, badgeId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
