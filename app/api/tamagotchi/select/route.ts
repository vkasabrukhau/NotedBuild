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

    const body = (await request.json()) as { species?: string | null };
    const species = body.species?.trim() || null;

    if (species) {
      // Activate a specific tamagotchi
      await prisma.$transaction(async (tx) => {
        const target = await tx.userTamagotchi.findUnique({
          where: { userId_species: { userId: dbUser.id, species } },
        });

        if (!target) throw new Error("Tamagotchi not owned.");

        await tx.userTamagotchi.updateMany({
          where: { userId: dbUser.id },
          data: { isActive: false },
        });

        await tx.userTamagotchi.update({
          where: { id: target.id },
          data: { isActive: true },
        });
      });
    } else {
      // Deselect all — show homepage GIF
      await prisma.userTamagotchi.updateMany({
        where: { userId: dbUser.id },
        data: { isActive: false },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Select failed.";
    const status = message === "Tamagotchi not owned." ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
