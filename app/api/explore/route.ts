import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/api-auth";
import { getExploreFeed, isExploreFeedId } from "@/lib/explore";

export async function GET(request: Request) {
  try {
    const dbUser = await getOrCreateDbUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const feedParam = searchParams.get("feed") ?? "school";

    if (!isExploreFeedId(feedParam)) {
      return NextResponse.json({ error: "Invalid feed." }, { status: 422 });
    }

    const notes = await getExploreFeed(feedParam, {
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
