import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/api-auth";
import { TAMAGOTCHI_SPECIES } from "@/lib/tamagotchi-config";

export async function POST() {
  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { prisma } = await import("@/lib/prisma");

    const existing = await prisma.userTamagotchi.findMany({
      where: { userId: dbUser.id },
      select: { species: true, isActive: true },
    });
    const ownedSpecies = new Set(existing.map((t) => t.species));
    const hasActive = existing.some((t) => t.isActive);

    let firstNew = !hasActive;
    for (const species of TAMAGOTCHI_SPECIES) {
      if (ownedSpecies.has(species.id)) continue;
      await prisma.userTamagotchi.create({
        data: { userId: dbUser.id, species: species.id, happiness: 10, isActive: firstNew },
      });
      firstNew = false;
    }

    const tamagotchis = await prisma.userTamagotchi.findMany({ where: { userId: dbUser.id } });
    return NextResponse.json({ tamagotchis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to unlock all.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
