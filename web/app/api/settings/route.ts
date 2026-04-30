import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, locationLat, locationLon, locationName, alertsEnabled } = body;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: name ?? undefined,
      locationLat: locationLat ?? null,
      locationLon: locationLon ?? null,
      locationName: locationName ?? null,
      alertsEnabled: Boolean(alertsEnabled),
    },
  });

  return NextResponse.json({ ok: true });
}
