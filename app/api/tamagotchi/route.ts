import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TAMAGOTCHI_SPECIES, toDateStr } from "@/lib/tamagotchi-config";

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
    create: { clerkId: clerkUser.id, email, fullName },
  });
}

export async function GET() {
  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const [streak, tamagotchis] = await Promise.all([
      prisma.userStreak.findUnique({ where: { userId: dbUser.id } }),
      prisma.userTamagotchi.findMany({
        where: { userId: dbUser.id },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const todayStr = toDateStr(new Date());
    const checkedInToday =
      streak?.lastCheckinAt != null &&
      toDateStr(streak.lastCheckinAt) === todayStr;

    return NextResponse.json({
      streak: {
        current: streak?.currentStreak ?? 0,
        longest: streak?.longestStreak ?? 0,
        totalCheckins: streak?.totalCheckins ?? 0,
        checkedInToday,
      },
      tamagotchis: tamagotchis.map((t) => ({
        species: t.species,
        displayName: t.displayName,
        health: t.health,
        level: t.level,
        currentThreshold: t.currentThreshold,
        isActive: t.isActive,
      })),
      // species the user has met the streak requirement for but hasn't been given yet
      // (useful if they load the page without triggering a checkin)
      unlockable: TAMAGOTCHI_SPECIES.filter(
        (s) =>
          s.unlockStreakDays !== null &&
          (streak?.currentStreak ?? 0) >= s.unlockStreakDays &&
          !tamagotchis.some((t) => t.species === s.id),
      ).map((s) => s.id),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load tamagotchi state.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
