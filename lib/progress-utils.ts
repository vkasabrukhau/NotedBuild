import { prisma } from "@/lib/prisma";
import {
  SPECIAL_PETS,
  EVOLUTION_LINES,
  isSpecialPetUnlocked,
  MAX_XP,
} from "@/lib/tamagotchi-config";
import type { UserProgressData } from "@/lib/tamagotchi-config";

/**
 * Gets or creates a UserProgress record.
 * For new records, bootstraps flags from existing data so existing users
 * aren't penalised when the progress system is first introduced.
 */
export async function getOrCreateProgress(userId: string): Promise<UserProgressData> {
  const existing = await prisma.userProgress.findUnique({ where: { userId } });
  if (existing) return existing as UserProgressData;

  // Bootstrap from existing state for users who predate the progress system
  const [noteCount, folderCount, friendCount] = await Promise.all([
    prisma.note.count({ where: { ownerId: userId, deletedAt: null } }),
    prisma.folder.count({ where: { ownerId: userId, deletedAt: null } }),
    prisma.friendship.count({
      where: {
        OR: [{ requesterId: userId }, { addresseeId: userId }],
        status: "ACCEPTED",
      },
    }),
  ]);

  return prisma.userProgress.create({
    data: {
      userId,
      hasSavedFirstNote: noteCount > 0,
      hasSavedFirstFolder: folderCount > 0,
      hasAddedFirstFriend: friendCount > 0,
    },
  }) as Promise<UserProgressData>;
}

/**
 * Awards global XP to the user (capped at MAX_XP).
 * Returns the updated progress record.
 */
export async function awardXp(userId: string, amount: number): Promise<UserProgressData> {
  const progress = await getOrCreateProgress(userId);
  const newXp = Math.min(MAX_XP, progress.globalXp + amount);
  if (newXp === progress.globalXp) return progress;

  const updated = await prisma.userProgress.update({
    where: { userId },
    data: { globalXp: newXp },
  });
  return updated as UserProgressData;
}

/**
 * Checks the current progress and creates UserTamagotchi records for any
 * special pets whose requirements are now fully met.
 * Also unlocks the first tier of any evolution line whose XP threshold is reached.
 * Returns the list of newly unlocked species IDs.
 */
export async function checkAndUnlockTamagotchis(
  userId: string,
  progress: UserProgressData,
): Promise<string[]> {
  const existing = await prisma.userTamagotchi.findMany({
    where: { userId },
    select: { species: true, lineId: true, isActive: true },
  });
  const ownedSpecies = new Set(existing.map((t) => t.species));
  const ownedLineIds = new Set(existing.map((t) => t.lineId).filter(Boolean));
  const hasActive = existing.some((t) => t.isActive);

  const newUnlocks: string[] = [];
  let setActive = !hasActive;

  // ── 1. Special pets (first-time action unlocks) ─────────────────────────────
  for (const pet of SPECIAL_PETS) {
    if (ownedSpecies.has(pet.id)) continue;
    if (!isSpecialPetUnlocked(pet, progress)) continue;

    await prisma.userTamagotchi.create({
      data: {
        userId,
        species: pet.id,
        lineId: null,
        happiness: 10,
        isActive: setActive,
      },
    });
    newUnlocks.push(pet.id);
    ownedSpecies.add(pet.id);
    setActive = false;
  }

  // ── 2. Evolution line first-tier unlocks (XP-gated) ────────────────────────
  for (const line of EVOLUTION_LINES) {
    if (ownedLineIds.has(line.id)) continue;
    const firstTier = line.tiers[0];
    if (progress.globalXp < firstTier.xpThreshold) continue;

    await prisma.userTamagotchi.create({
      data: {
        userId,
        species: firstTier.id,
        lineId: line.id,
        happiness: 10,
        isActive: setActive,
      },
    });
    newUnlocks.push(firstTier.id);
    ownedLineIds.add(line.id);
    setActive = false;
  }

  return newUnlocks;
}

/**
 * Awards XP and then checks for newly unlocked pets.
 * Returns { progress, newUnlocks }.
 */
export async function awardXpAndCheckUnlocks(
  userId: string,
  amount: number,
): Promise<{ progress: UserProgressData; newUnlocks: string[] }> {
  const progress = await awardXp(userId, amount);
  const newUnlocks = await checkAndUnlockTamagotchis(userId, progress);
  return { progress, newUnlocks };
}
