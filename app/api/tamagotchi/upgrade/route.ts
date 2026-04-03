import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser } from "@/lib/api-auth";
import { getOrCreateProgress } from "@/lib/progress-utils";
import { DEV_UNLOCK_ALL, EVOLUTION_LINES, SPECIAL_PETS, getTier, getLineForTier } from "@/lib/tamagotchi-config";

/**
 * POST /api/tamagotchi/upgrade
 * Body: { speciesId: string; setActive?: boolean }
 *
 * Selects a specific evolution tier or special pet as the user's active tamagotchi.
 * - For evolution tiers: validates XP, then creates or updates the UserTamagotchi
 *   record for that line.
 * - For special pets: validates ownership, then sets active.
 * - setActive defaults to true.
 */
export async function POST(request: Request) {
  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const body = (await request.json()) as { speciesId?: string; setActive?: boolean };
    const speciesId = body.speciesId?.trim();
    const setActive = body.setActive !== false;

    if (!speciesId) {
      return NextResponse.json({ error: "speciesId is required." }, { status: 422 });
    }

    const progress = await getOrCreateProgress(dbUser.id);

    // ── Case 1: evolution line tier ────────────────────────────────────────────
    const tier = getTier(speciesId);
    if (tier) {
      if (!DEV_UNLOCK_ALL && progress.globalXp < tier.xpThreshold) {
        return NextResponse.json(
          { error: `Need ${tier.xpThreshold} XP to unlock ${tier.name}.` },
          { status: 403 },
        );
      }

      const line = getLineForTier(speciesId)!;

      await prisma.$transaction(async (tx) => {
        const existing = await tx.userTamagotchi.findFirst({
          where: { userId: dbUser.id, lineId: line.id },
        });

        if (existing) {
          // Update the species to the newly selected tier
          if (existing.species !== speciesId) {
            // Need to delete old record (unique on species) then create new
            // Actually: just update species in-place
            await tx.userTamagotchi.update({
              where: { id: existing.id },
              data: { species: speciesId, isActive: setActive ? true : existing.isActive },
            });
          } else if (setActive) {
            await tx.userTamagotchi.update({
              where: { id: existing.id },
              data: { isActive: true },
            });
          }
        } else {
          // First time selecting this line → create record
          await tx.userTamagotchi.create({
            data: {
              userId: dbUser.id,
              species: speciesId,
              lineId: line.id,
              happiness: 10,
              isActive: setActive,
            },
          });
        }

        if (setActive) {
          // Deactivate all OTHER pets
          await tx.userTamagotchi.updateMany({
            where: { userId: dbUser.id, lineId: { not: line.id } },
            data: { isActive: false },
          });
          // If we updated in place above, the lineId record is already active.
          // If lineId is null (special pets), handle via separate query:
          await tx.userTamagotchi.updateMany({
            where: { userId: dbUser.id, lineId: null },
            data: { isActive: false },
          });
        }
      });

      return NextResponse.json({ success: true });
    }

    // ── Case 2: special pet ────────────────────────────────────────────────────
    const specialPet = SPECIAL_PETS.find((p) => p.id === speciesId);
    if (specialPet) {
      const owned = await prisma.userTamagotchi.findUnique({
        where: { userId_species: { userId: dbUser.id, species: speciesId } },
      });
      if (!owned && !DEV_UNLOCK_ALL) {
        return NextResponse.json({ error: "Pet not yet unlocked." }, { status: 403 });
      }

      if (setActive) {
        const record = owned ?? await prisma.userTamagotchi.create({
          data: { userId: dbUser.id, species: speciesId, lineId: null, happiness: 10, isActive: false },
        });
        await prisma.$transaction([
          prisma.userTamagotchi.updateMany({
            where: { userId: dbUser.id },
            data: { isActive: false },
          }),
          prisma.userTamagotchi.update({
            where: { id: record.id },
            data: { isActive: true },
          }),
        ]);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown species ID." }, { status: 422 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upgrade failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
