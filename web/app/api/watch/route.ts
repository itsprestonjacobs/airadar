import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNewWatchBadges } from "@/lib/badges";
import { headers } from "next/headers";

// Called every 30 seconds while a signed-in user is watching the stream
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await req.json().catch(() => ({}));
  const userId = session.user.id;
  const PING_INTERVAL = 30; // seconds

  // Upsert watch session
  let watchSession;
  if (sessionId) {
    watchSession = await prisma.watchSession.findFirst({
      where: { id: sessionId, userId },
    });
  }

  if (watchSession) {
    watchSession = await prisma.watchSession.update({
      where: { id: watchSession.id },
      data: {
        lastPing: new Date(),
        durationSeconds: { increment: PING_INTERVAL },
      },
    });
  } else {
    watchSession = await prisma.watchSession.create({
      data: { userId },
    });
  }

  // Update user's total watch time
  const user = await prisma.user.update({
    where: { id: userId },
    data: { totalWatchSeconds: { increment: sessionId ? PING_INTERVAL : 0 } },
    include: { userBadges: { select: { badgeId: true } } },
  });

  // Check and award any newly unlocked watch badges
  const earned = user.userBadges.map((b) => b.badgeId);
  const newBadges = getNewWatchBadges(user.totalWatchSeconds, earned);

  if (newBadges.length) {
    for (const badgeId of newBadges) {
      await prisma.userBadge.upsert({
        where: { userId_badgeId: { userId, badgeId } },
        create: { userId, badgeId },
        update: {},
      });
    }
  }

  return NextResponse.json({
    sessionId: watchSession.id,
    totalWatchSeconds: user.totalWatchSeconds,
    newBadges,
  });
}
