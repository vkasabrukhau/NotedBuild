import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/api-auth";
import { getRecommendedExploreFeed } from "@/lib/explore";

export async function GET() {
  try {
    const dbUser = await getOrCreateDbUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const notes = await getRecommendedExploreFeed({
      id: dbUser.id,
      schoolId: dbUser.schoolId,
    });

    return NextResponse.json({ notes });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load explore feed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
