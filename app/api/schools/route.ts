import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getMatchedSchoolLogoUrl } from "@/lib/school-logo";
import { getAdjacentStates } from "@/lib/state-adjacency";

function stateConditions(state: string) {
  return [
    { location: { endsWith: `, ${state}` } },
    { location: { equals: state } },
  ];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state")?.toUpperCase().trim() ?? null;
    const tier = searchParams.get("tier") ?? null;

    let where: Prisma.SchoolWhereInput = {};

    if (state && tier === "own") {
      where = { OR: stateConditions(state) };
    } else if (state && tier === "adjacent") {
      const neighbors = getAdjacentStates(state);
      if (neighbors.length === 0) {
        return NextResponse.json({ schools: [] });
      }
      where = { OR: neighbors.flatMap(stateConditions) };
    } else if (state && tier === "rest") {
      const exclude = [state, ...getAdjacentStates(state)];
      where = { NOT: { OR: exclude.flatMap(stateConditions) } };
    }

    const schools = await prisma.school.findMany({
      where,
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

    const mapped = schools.map((school) => ({
      id: school.id,
      name: school.name,
      location: school.location,
      primaryColor: school.primaryColor,
      accentColor: school.accentColor,
      logoUrl: getMatchedSchoolLogoUrl(school.name),
      studentCount: school._count.users,
    }));

    // Within each tier, schools with a logo appear before those without.
    // The DB ordering (student count desc) is preserved within each group.
    mapped.sort((a, b) => {
      if (a.logoUrl && !b.logoUrl) return -1;
      if (!a.logoUrl && b.logoUrl) return 1;
      return 0;
    });

    return NextResponse.json({ schools: mapped });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load schools.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
