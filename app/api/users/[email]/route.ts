import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  profileUserSelect,
  toProfileViewData,
  getProfileNotes,
  getProfileFriends,
  getProfileViewerData,
} from "@/lib/profile-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ email: string }> },
) {
  try {
    const { userId } = await auth();
    const { email } = await params;
    const decodedEmail = decodeURIComponent(email);

    const targetUser = await prisma.user.findUnique({
      where: { email: decodedEmail },
      select: profileUserSelect,
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    let viewerDbId: string | null = null;

    if (userId) {
      const viewer = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true },
      });
      viewerDbId = viewer?.id ?? null;
    }

    const [friendCount, notes, friends, viewer] = await Promise.all([
      prisma.friendship.count({
        where: {
          status: "ACCEPTED",
          OR: [{ requesterId: targetUser.id }, { addresseeId: targetUser.id }],
        },
      }),
      getProfileNotes(targetUser.id, targetUser.email, 12, { onlyPublished: true }),
      getProfileFriends(targetUser.id),
      getProfileViewerData(viewerDbId, targetUser.id),
    ]);

    const profile = toProfileViewData(targetUser, friendCount, notes, friends);

    return NextResponse.json({ profile, viewer });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load profile.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
