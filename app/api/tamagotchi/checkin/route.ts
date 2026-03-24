import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TAMAGOTCHI_SPECIES, getSpecies, toDateStr } from "@/lib/tamagotchi-config";

async function getOrCreateDbUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) throw new Error("User has no email.");

  const fullName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() ||
    clerkUser.username ||
    email;

  return prisma.user.upsert({
    where: { clerkId: clerkUser.id },
    update: { email, fullName },
    create: { clerkId: clerkUser.id, email, fullName, notesOwnedCount: 0, foldersOwnedCount: 0 },
  });
}

export async function POST() {
  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const todayStr = toDateStr(now);

      // ── 1. Get or create streak ──────────────────────────────────────
      let streak = await tx.userStreak.findUnique({ where: { userId: dbUser.id } });
      if (!streak) {
        streak = await tx.userStreak.create({ data: { userId: dbUser.id } });
      }

      // ── 2. Already checked in today? ────────────────────────────────
      if (streak.lastCheckinAt != null && toDateStr(streak.lastCheckinAt) === todayStr) {
        const tamagotchis = await tx.userTamagotchi.findMany({
          where: { userId: dbUser.id },
          orderBy: { createdAt: "asc" },
        });
        return { streak, tamagotchis, newUnlocks: [] as string[], alreadyCheckedIn: true };
      }

      // ── 3. Days missed since last check-in ──────────────────────────
      let daysMissed = 0;
      if (streak.lastCheckinAt != null) {
        const lastMs = new Date(toDateStr(streak.lastCheckinAt)).getTime();
        const todayMs = new Date(todayStr).getTime();
        daysMissed = Math.max(0, Math.round((todayMs - lastMs) / 86_400_000) - 1);
      }

      // ── 4. Update streak ─────────────────────────────────────────────
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

      // ── 5. Auto-unlock tamagotchis (sequential) ──────────────────────
      const existingTamas = await tx.userTamagotchi.findMany({
        where: { userId: dbUser.id },
        orderBy: { createdAt: "asc" },
      });
      const ownedSpecies = new Set(existingTamas.map((t) => t.species));
      const newUnlocks: string[] = [];
      const noneActiveYet = !existingTamas.some((t) => t.isActive);

      for (const species of TAMAGOTCHI_SPECIES) {
        if (ownedSpecies.has(species.id)) continue;

        const shouldUnlock =
          species.unlockStreakDays === null ||
          newStreakValue >= species.unlockStreakDays;
        if (!shouldUnlock) continue;

        const setActive = species.unlockStreakDays === null && noneActiveYet;

        await tx.userTamagotchi.create({
          data: {
            userId: dbUser.id,
            species: species.id,
            health: 0,
            level: 1,
            currentThreshold: species.startingThreshold,
            isActive: setActive,
          },
        });

        newUnlocks.push(species.id);
        ownedSpecies.add(species.id);
      }

      // ── 6. Update health for all owned tamagotchis (sequential) ──────
      const allTamas = await tx.userTamagotchi.findMany({
        where: { userId: dbUser.id },
        orderBy: { createdAt: "asc" },
      });

      const updatedTamas = [];
      for (const tama of allTamas) {
        const config = getSpecies(tama.species);
        if (!config) {
          updatedTamas.push(tama);
          continue;
        }

        let { health, level, currentThreshold } = tama;

        if (daysMissed > 0) {
          health = Math.max(0, health - daysMissed);
        } else {
          health += 1;
          if (health >= currentThreshold) {
            level += 1;
            health = 0;
            currentThreshold += config.healthUpgradeBump;
          }
        }

        const updated = await tx.userTamagotchi.update({
          where: { id: tama.id },
          data: { health, level, currentThreshold },
        });
        updatedTamas.push(updated);
      }

      return { streak: updatedStreak, tamagotchis: updatedTamas, newUnlocks, alreadyCheckedIn: false };
    });

    const todayStr = toDateStr(new Date());
    const checkedInToday = toDateStr(result.streak.lastCheckinAt!) === todayStr;

    return NextResponse.json({
      streak: {
        current: result.streak.currentStreak,
        longest: result.streak.longestStreak,
        totalCheckins: result.streak.totalCheckins,
        checkedInToday,
      },
      tamagotchis: result.tamagotchis.map((t) => ({
        species: t.species,
        displayName: t.displayName,
        health: t.health,
        level: t.level,
        currentThreshold: t.currentThreshold,
        isActive: t.isActive,
      })),
      newUnlocks: result.newUnlocks,
      alreadyCheckedIn: result.alreadyCheckedIn,
    });
  } catch (error) {
    console.error("[tamagotchi/checkin]", error);
    const message = error instanceof Error ? error.message : "Check-in failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
