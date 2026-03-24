import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
