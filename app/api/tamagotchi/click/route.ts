import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser } from "@/lib/api-auth";
import { toDateStr } from "@/lib/tamagotchi-config";

export async function POST() {
  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const activeTama = await prisma.userTamagotchi.findFirst({
      where: { userId: dbUser.id, isActive: true },
    });

    if (!activeTama) {
      return NextResponse.json({ error: "No active tamagotchi." }, { status: 404 });
    }

    const todayStr = toDateStr(new Date());
    const alreadyClickedToday =
      activeTama.lastClickAt != null &&
      toDateStr(activeTama.lastClickAt) === todayStr;

    if (alreadyClickedToday) {
      return NextResponse.json({
        happiness: activeTama.happiness,
        alreadyClickedToday: true,
      });
    }

    const updated = await prisma.userTamagotchi.update({
      where: { id: activeTama.id },
      data: {
        happiness: Math.min(10, activeTama.happiness + 1),
        lastClickAt: new Date(),
      },
    });

    return NextResponse.json({
      happiness: updated.happiness,
      alreadyClickedToday: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Click failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
