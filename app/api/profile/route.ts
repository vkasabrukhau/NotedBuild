import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type UpdateProfileBody = {
  age?: number | null;
  bio?: string | null;
  fullName?: string;
  schoolId?: string | null;
};

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as UpdateProfileBody;
    const fullName = body.fullName?.trim();

    if (!fullName) {
      return NextResponse.json(
        { error: "A full name is required." },
        { status: 422 },
      );
    }

    const ageValue =
      body.age === null || body.age === undefined
        ? null
        : Number(body.age);

    if (
      ageValue !== null &&
      (!Number.isInteger(ageValue) || ageValue < 1 || ageValue > 120)
    ) {
      return NextResponse.json(
        { error: "Age must be a whole number between 1 and 120." },
        { status: 422 },
      );
    }

    const schoolId = body.schoolId?.trim() ? body.schoolId.trim() : null;

    if (schoolId) {
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { id: true },
      });

      if (!school) {
        return NextResponse.json(
          { error: "That school could not be found." },
          { status: 404 },
        );
      }
    }

    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    const primaryEmail =
      clerkUser.emailAddresses.find(
        (emailAddress) => emailAddress.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

    if (!primaryEmail) {
      return NextResponse.json(
        { error: "Your Clerk account does not have a primary email address." },
        { status: 422 },
      );
    }

    const bioValue = body.bio === null || body.bio === undefined ? null : body.bio.trim().slice(0, 500) || null;

    const user = await prisma.user.update({
      where: {
        clerkId: userId,
      },
      data: {
        age: ageValue,
        bio: bioValue,
        email: primaryEmail,
        fullName,
        profilePhotoUrl: clerkUser.imageUrl,
        schoolId,
      },
      select: {
        age: true,
        email: true,
        fullName: true,
        profilePhotoUrl: true,
        schoolId: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update profile.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
