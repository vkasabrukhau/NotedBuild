import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser } from "@/lib/api-auth";

export async function POST(request: Request) {
  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as { species?: string; name?: string };
    const species = body.species?.trim();
    const name = body.name?.trim() ?? null;

    if (!species) {
      return NextResponse.json({ error: "species is required." }, { status: 422 });
    }

    const tama = await prisma.userTamagotchi.findUnique({
      where: { userId_species: { userId: dbUser.id, species } },
    });

    if (!tama) {
      return NextResponse.json({ error: "Tamagotchi not owned." }, { status: 404 });
    }

    await prisma.userTamagotchi.update({
      where: { id: tama.id },
      // null clears the custom name (reverts to species default)
      data: { displayName: name || null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Rename failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
