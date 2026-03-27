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
        return { streak, tamagotchis, newUnlocks: [] as string[], newLocks: [] as string[], alreadyCheckedIn: true };
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

      // ── 5. Auto-unlock new tamagotchis ───────────────────────────────
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

      // ── 6. Lock/unlock tamagotchis based on current streak ───────────
      // Re-fetch after potential new creations
      const allTamasBeforeUpdate = await tx.userTamagotchi.findMany({
        where: { userId: dbUser.id },
        orderBy: { createdAt: "asc" },
      });

      const newLocks: string[] = [];
      let activeBecameLocked = false;

      for (const tama of allTamasBeforeUpdate) {
        const config = getSpecies(tama.species);
        if (!config || config.unlockStreakDays === null) continue; // Bear is never locked

        const meetsThreshold = newStreakValue >= config.unlockStreakDays;

        if (!meetsThreshold && !tama.isLocked) {
          // Streak dropped below unlock requirement — lock this tamagotchi
          await tx.userTamagotchi.update({
            where: { id: tama.id },
            data: { isLocked: true, isActive: false },
          });
          newLocks.push(tama.species);
          if (tama.isActive) activeBecameLocked = true;
        } else if (meetsThreshold && tama.isLocked) {
          // Streak recovered — re-unlock
          await tx.userTamagotchi.update({
            where: { id: tama.id },
            data: { isLocked: false },
          });
        }
      }

      // If the active tamagotchi was just locked, fall back to bear
      if (activeBecameLocked) {
        await tx.userTamagotchi.updateMany({
          where: { userId: dbUser.id, species: "bear" },
          data: { isActive: true },
        });
      }

      // ── 7. Update health for all unlocked tamagotchis ────────────────
      const allTamas = await tx.userTamagotchi.findMany({
        where: { userId: dbUser.id },
        orderBy: { createdAt: "asc" },
      });

      const updatedTamas = [];
      for (const tama of allTamas) {
        // Skip locked tamagotchis — no health changes while inaccessible
        if (tama.isLocked) {
          updatedTamas.push(tama);
          continue;
        }

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

      return { streak: updatedStreak, tamagotchis: updatedTamas, newUnlocks, newLocks, alreadyCheckedIn: false };
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
        isLocked: t.isLocked,
      })),
      newUnlocks: result.newUnlocks,
      newLocks: result.newLocks,
      alreadyCheckedIn: result.alreadyCheckedIn,
    });
  } catch (error) {
    console.error("[tamagotchi/checkin]", error);
    const message = error instanceof Error ? error.message : "Check-in failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
