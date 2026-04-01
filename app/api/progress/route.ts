import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/api-auth";
import { getOrCreateProgress, checkAndUnlockTamagotchis } from "@/lib/progress-utils";
import type { ProgressKey } from "@/lib/tamagotchi-config";

export async function GET() {
  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const progress = await getOrCreateProgress(dbUser.id);
    return NextResponse.json({ progress });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load progress.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const body = (await request.json()) as { key?: string; value?: boolean };
    const validKeys: ProgressKey[] = [
      "hasSavedFirstNote",
      "hasSavedFirstFolder",
      "hasAddedFirstFriend",
      "hasAddedFirstCommunity",
      "hasAddedAnotherSchoolCommunity",
      "hasMadeFirstStyleChange",
      "hasMadeFirstFontChange",
    ];

    if (!body.key || !validKeys.includes(body.key as ProgressKey)) {
      return NextResponse.json({ error: "Invalid progress key." }, { status: 422 });
    }

    const { prisma } = await import("@/lib/prisma");
    const updated = await prisma.userProgress.upsert({
      where: { userId: dbUser.id },
      update: { [body.key]: true },
      create: { userId: dbUser.id, [body.key]: true },
    });

    const newUnlocks = await checkAndUnlockTamagotchis(dbUser.id, updated);
    return NextResponse.json({ progress: updated, newUnlocks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update progress.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
