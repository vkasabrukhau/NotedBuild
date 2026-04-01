import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDateStr } from "@/lib/tamagotchi-config";
import { getOrCreateDbUser } from "@/lib/api-auth";
import { awardXpAndCheckUnlocks, getOrCreateProgress } from "@/lib/progress-utils";

export async function POST() {
  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const todayStr = toDateStr(now);

      // ── 1. Get or create streak ──────────────────────────────────────────────
      let streak = await tx.userStreak.findUnique({ where: { userId: dbUser.id } });
      if (!streak) {
        streak = await tx.userStreak.create({ data: { userId: dbUser.id } });
      }

      // ── 2. Already checked in today? ──────────────────────────────────────────
      if (streak.lastCheckinAt != null && toDateStr(streak.lastCheckinAt) === todayStr) {
        const tamagotchis = await tx.userTamagotchi.findMany({
          where: { userId: dbUser.id },
          orderBy: { createdAt: "asc" },
        });
        return { streak, tamagotchis, alreadyCheckedIn: true, daysMissed: 0 };
      }

      // ── 3. Days missed since last check-in ─────────────────────────────────────
      let daysMissed = 0;
      if (streak.lastCheckinAt != null) {
        const lastMs = new Date(toDateStr(streak.lastCheckinAt)).getTime();
        const todayMs = new Date(todayStr).getTime();
        daysMissed = Math.max(0, Math.round((todayMs - lastMs) / 86_400_000) - 1);
      }

      // ── 4. Update streak ────────────────────────────────────────────────────────
      const newStreakValue = daysMissed === 0 ? streak.currentStreak + 1 : 1;
      const newLongest = Math.max(streak.longestStreak, newStreakValue);

      const updatedStreak = await tx.userStreak.update({
        where: { userId: dbUser.id },
        data: {
          currentStreak: newStreakValue,
          longestStreak: newLongest,
          lastCheckinAt: now,
          totalCheckins: streak.totalCheckins + 1,
        },
      });

      // ── 5. Update happiness for all owned tamagotchis ──────────────────────────
      const tamagotchisBeforeUpdate = await tx.userTamagotchi.findMany({
        where: { userId: dbUser.id },
        orderBy: { createdAt: "asc" },
      });

      const updatedTamas = [];
      for (const tama of tamagotchisBeforeUpdate) {
        let { happiness } = tama;
        if (daysMissed > 0) {
          happiness = Math.max(0, happiness - daysMissed);
        } else {
          // Consecutive check-in reinforces happiness
          happiness = Math.min(10, happiness + 1);
        }
        const updated = await tx.userTamagotchi.update({
          where: { id: tama.id },
          data: { happiness },
        });
        updatedTamas.push(updated);
      }

      return { streak: updatedStreak, tamagotchis: updatedTamas, alreadyCheckedIn: false, daysMissed };
    });

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

    const todayStr = toDateStr(new Date());
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
