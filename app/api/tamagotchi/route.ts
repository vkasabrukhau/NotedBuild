import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDateStr } from "@/lib/tamagotchi-config";
import { getOrCreateDbUser } from "@/lib/api-auth";
import { getOrCreateProgress, checkAndUnlockTamagotchis } from "@/lib/progress-utils";

export async function GET() {
  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const progress = await getOrCreateProgress(dbUser.id);
    await checkAndUnlockTamagotchis(dbUser.id, progress);

    const [streak, tamagotchis] = await Promise.all([
      prisma.userStreak.findUnique({ where: { userId: dbUser.id } }),
      prisma.userTamagotchi.findMany({
        where: { userId: dbUser.id },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const todayStr = toDateStr(new Date());
    const checkedInToday =
      streak?.lastCheckinAt != null && toDateStr(streak.lastCheckinAt) === todayStr;

    return NextResponse.json({
      globalXp: progress.globalXp,
      streak: {
        current: streak?.currentStreak ?? 0,
        longest: streak?.longestStreak ?? 0,
        totalCheckins: streak?.totalCheckins ?? 0,
        checkedInToday,
      },
      tamagotchis: tamagotchis.map((t) => ({
        species: t.species,
        lineId: t.lineId,
        displayName: t.displayName,
        happiness: t.happiness,
        isActive: t.isActive,
        lastClickAt: t.lastClickAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load tamagotchi state.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
