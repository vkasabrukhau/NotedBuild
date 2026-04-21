import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMatchedSchoolLogoUrl } from "@/lib/school-logo";
import { getRecommendedExploreFeed } from "@/lib/explore";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ schoolId: string }> },
) {
  try {
    const { userId } = await auth();
    const { schoolId } = await params;

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        location: true,
        primaryColor: true,
        accentColor: true,
        users: {
          take: 30,
          orderBy: { joinedAt: "asc" },
          select: {
            id: true,
            email: true,
            fullName: true,
            profilePhotoUrl: true,
            schoolId: true,
          },
        },
      },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found." }, { status: 404 });
    }

    let viewerDbId: string | null = null;
    let viewerSchoolId: string | null = null;

    if (userId) {
      const viewer = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true, schoolId: true },
      });
      viewerDbId = viewer?.id ?? null;
      viewerSchoolId = viewer?.schoolId ?? null;
    }

    // Fall back to a system viewer if not signed in so public notes still show
    const viewer = {
      id: viewerDbId ?? "anonymous",
      schoolId: viewerSchoolId ?? school.id,
    };

    // Get school notes using the explore feed logic, filtered to this school's members
    const schoolMemberIds = new Set(school.users.map((u) => u.id));
    const allNotes = await getRecommendedExploreFeed(viewer, 48);
    const schoolNotes = allNotes.filter((note) =>
      schoolMemberIds.has(note.owner.id),
    );

    return NextResponse.json({
      school: {
        id: school.id,
        name: school.name,
        location: school.location,
        primaryColor: school.primaryColor,
        accentColor: school.accentColor,
        logoUrl: getMatchedSchoolLogoUrl(school.name),
      },
      students: school.users,
      notes: schoolNotes,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load school.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
