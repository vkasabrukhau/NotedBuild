import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDateStr } from "@/lib/tamagotchi-config";
import { getOrCreateDbUser } from "@/lib/api-auth";
import { awardXpAndCheckUnlocks, getOrCreateProgress } from "@/lib/progress-utils";

export async function POST() {
  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const now = new Date();
    const todayStr = toDateStr(now);

    // ── 1–4. Update streak atomically (small, fast transaction) ─────────────────
    const streakResult = await prisma.$transaction(async (tx) => {
      let streak = await tx.userStreak.findUnique({ where: { userId: dbUser.id } });
      if (!streak) {
        streak = await tx.userStreak.create({ data: { userId: dbUser.id } });
      }

      if (streak.lastCheckinAt != null && toDateStr(streak.lastCheckinAt) === todayStr) {
        return { streak, alreadyCheckedIn: true, daysMissed: 0 };
      }

      let daysMissed = 0;
      if (streak.lastCheckinAt != null) {
        const lastMs = new Date(toDateStr(streak.lastCheckinAt)).getTime();
        const todayMs = new Date(todayStr).getTime();
        daysMissed = Math.max(0, Math.round((todayMs - lastMs) / 86_400_000) - 1);
      }

      const newStreakValue = daysMissed === 0 ? streak.currentStreak + 1 : 1;
      const updatedStreak = await tx.userStreak.update({
        where: { userId: dbUser.id },
        data: {
          currentStreak: newStreakValue,
          longestStreak: Math.max(streak.longestStreak, newStreakValue),
          lastCheckinAt: now,
          totalCheckins: streak.totalCheckins + 1,
        },
      });

      return { streak: updatedStreak, alreadyCheckedIn: false, daysMissed };
    });

    // ── 5. Update happiness outside the transaction (parallel) ───────────────────
    const tamagotchisBeforeUpdate = await prisma.userTamagotchi.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "asc" },
    });

    let updatedTamas = tamagotchisBeforeUpdate;
    if (!streakResult.alreadyCheckedIn) {
      updatedTamas = await Promise.all(
        tamagotchisBeforeUpdate.map((tama) => {
          const happiness = streakResult.daysMissed > 0
            ? Math.max(0, tama.happiness - streakResult.daysMissed)
            : Math.min(10, tama.happiness + 1);
          return prisma.userTamagotchi.update({
            where: { id: tama.id },
            data: { happiness },
          });
        }),
      );
    }

    const result = { ...streakResult, tamagotchis: updatedTamas };

    // ── 6. Award 2 global XP (only on first check-in of the day) ──────────────
    let globalXp: number;
    let newUnlocks: string[] = [];
    if (!result.alreadyCheckedIn && result.daysMissed === 0) {
      const { progress, newUnlocks: unlocks } = await awardXpAndCheckUnlocks(dbUser.id, 2);
      globalXp = progress.globalXp;
      newUnlocks = unlocks;
    } else {
      const progress = await getOrCreateProgress(dbUser.id);
      globalXp = progress.globalXp;
    }

    // Reload tamagotchis if new ones were unlocked
    const finalTamas = newUnlocks.length > 0
      ? await prisma.userTamagotchi.findMany({
          where: { userId: dbUser.id },
          orderBy: { createdAt: "asc" },
        })
      : result.tamagotchis;

    const checkedInToday =
      result.streak.lastCheckinAt != null &&
      toDateStr(result.streak.lastCheckinAt) === todayStr;

    return NextResponse.json({
      globalXp,
      streak: {
        current: result.streak.currentStreak,
        longest: result.streak.longestStreak,
        totalCheckins: result.streak.totalCheckins,
        checkedInToday,
      },
      tamagotchis: finalTamas.map((t) => ({
        species: t.species,
        lineId: t.lineId,
        displayName: t.displayName,
        happiness: t.happiness,
        isActive: t.isActive,
        lastClickAt: t.lastClickAt?.toISOString() ?? null,
      })),
      newUnlocks,
      alreadyCheckedIn: result.alreadyCheckedIn,
    });
  } catch (error) {
    console.error("[tamagotchi/checkin]", error);
    const message = error instanceof Error ? error.message : "Check-in failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
