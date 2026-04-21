import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMatchedSchoolLogoUrl } from "@/lib/school-logo";

export async function GET() {
  try {
    const schools = await prisma.school.findMany({
      orderBy: { users: { _count: "desc" } },
      select: {
        id: true,
        name: true,
        location: true,
        primaryColor: true,
        accentColor: true,
        _count: {
          select: { users: true },
        },
      },
    });

    return NextResponse.json({
      schools: schools.map((school) => ({
        id: school.id,
        name: school.name,
        location: school.location,
        primaryColor: school.primaryColor,
        accentColor: school.accentColor,
        logoUrl: getMatchedSchoolLogoUrl(school.name),
        studentCount: school._count.users,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load schools.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
