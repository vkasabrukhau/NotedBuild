import { auth, currentUser } from "@clerk/nextjs/server";
import ClerkSignUpView from "@/components/auth/clerk-sign-up";
import PersonalInfoView from "@/components/personal-info/personal-info";
import RootHomeShell from "@/components/root-home-shell";
import SignUpView from "@/components/sign-up/sign-up";
import type { ProfileViewData } from "@/components/profile/profile-view";
import { calculateAgeFromBirthdate } from "@/lib/birthdate";
import { prisma } from "@/lib/prisma";
import { getMatchedSchoolLogoUrl } from "@/lib/school-logo";
import {
  getClerkUserEmail,
  getClerkUserFullName,
  syncClerkUserToDb,
} from "@/lib/sync-clerk-user";

type DbStatus = {
  ok: boolean;
  matchedUser: {
    id: string;
    age: number | null;
    email: string;
    folderCount: number;
    fullName: string;
    joinedAt: string;
    schoolAccentColor: string | null;
    schoolId: string | null;
    schoolLocation: string | null;
    schoolName: string | null;
    schoolPrimaryColor: string | null;
    noteUsageCount: number;
    profilePhotoUrl: string | null;
  } | null;
  error: string | null;
};

function getBirthdateFromClerkUser(
  clerkUser: Awaited<ReturnType<typeof currentUser>>,
): string | null {
  const birthdate = clerkUser?.unsafeMetadata?.birthdate;
  return typeof birthdate === "string" ? birthdate : null;
}

async function getDbStatus(
  clerkId: string | null,
  clerkUser?: Awaited<ReturnType<typeof currentUser>>,
): Promise<DbStatus> {
  try {
    const existingUser = clerkId
      ? await prisma.user.findUnique({
          where: { clerkId },
          select: {
            id: true,
            age: true,
            email: true,
            foldersOwnedCount: true,
            fullName: true,
            joinedAt: true,
            profilePhotoUrl: true,
            schoolId: true,
            school: {
              select: {
                accentColor: true,
                location: true,
                name: true,
                primaryColor: true,
              },
            },
            _count: {
              select: {
                notes: {
                  where: {
                    deletedAt: null,
                  },
                },
              },
            },
          },
        })
      : null;

    if (!clerkId || !clerkUser) {
      return {
        ok: true,
        matchedUser: existingUser
          ? {
              id: existingUser.id,
              age: existingUser.age,
              email: existingUser.email,
              folderCount: existingUser.foldersOwnedCount,
              fullName: existingUser.fullName,
              joinedAt: existingUser.joinedAt.toISOString(),
              schoolAccentColor: existingUser.school?.accentColor ?? null,
              schoolId: existingUser.schoolId,
              schoolLocation: existingUser.school?.location ?? null,
              schoolName: existingUser.school?.name ?? null,
              schoolPrimaryColor: existingUser.school?.primaryColor ?? null,
              noteUsageCount: existingUser._count.notes,
              profilePhotoUrl: existingUser.profilePhotoUrl,
            }
          : null,
        error: null,
      };
    }

    const email = getClerkUserEmail(clerkUser) ?? existingUser?.email ?? "";
    const derivedFullName = getClerkUserFullName(
      clerkUser,
      email,
      existingUser?.fullName,
    );
    const derivedAge = calculateAgeFromBirthdate(
      getBirthdateFromClerkUser(clerkUser) ?? "",
    );

    if (!email) {
      return {
        ok: false,
        matchedUser: null,
        error: "Missing required Clerk email data.",
      };
    }

    const syncedUser = await syncClerkUserToDb(clerkUser, {
      age: derivedAge ?? undefined,
      fullName: derivedFullName,
    });

    const matchedUser = await prisma.user.findUnique({
      where: {
        id: syncedUser.id,
      },
      select: {
        id: true,
        age: true,
        email: true,
        foldersOwnedCount: true,
        fullName: true,
        joinedAt: true,
        profilePhotoUrl: true,
        schoolId: true,
        school: {
          select: {
            accentColor: true,
            location: true,
            name: true,
            primaryColor: true,
          },
        },
        _count: {
          select: {
            notes: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },
    });

    if (!matchedUser) {
      throw new Error("User record was not found after syncing with Clerk.");
    }

    return {
      ok: true,
      matchedUser: {
        id: matchedUser.id,
        age: matchedUser.age,
        email: matchedUser.email,
        folderCount: matchedUser.foldersOwnedCount,
        fullName: matchedUser.fullName,
        joinedAt: matchedUser.joinedAt.toISOString(),
        schoolAccentColor: matchedUser.school?.accentColor ?? null,
        schoolId: matchedUser.schoolId,
        schoolLocation: matchedUser.school?.location ?? null,
        schoolName: matchedUser.school?.name ?? null,
        schoolPrimaryColor: matchedUser.school?.primaryColor ?? null,
        noteUsageCount: matchedUser._count.notes,
        profilePhotoUrl: matchedUser.profilePhotoUrl,
      },
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      matchedUser: null,
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}

export default async function Home() {
  const { userId } = await auth();

  if (!userId) {
    return <ClerkSignUpView />;
  }

  const clerkUser = await currentUser();

  if (!clerkUser) {
    return <ClerkSignUpView />;
  }

  const dbStatus = await getDbStatus(userId, clerkUser);

  if (!dbStatus.ok) {
    return <main>{dbStatus.error}</main>;
  }

  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress ??
    dbStatus.matchedUser?.email ??
    "";

  const fullName =
    clerkUser?.fullName ??
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ??
    dbStatus.matchedUser?.fullName ??
    "";

  if (!dbStatus.matchedUser || dbStatus.matchedUser.age === null) {
    return (
      <PersonalInfoView
        clerkId={userId}
        email={email}
        fullName={fullName}
      />
    );
  }

  if (dbStatus.matchedUser.schoolId === null) {
    const schools = await prisma.school.findMany({
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        location: true,
      },
    });

    return <SignUpView fullName={fullName} schools={schools} />;
  }

  const profile: ProfileViewData = {
    age: dbStatus.matchedUser.age,
    email,
    folderCount: dbStatus.matchedUser.folderCount,
    fullName,
    joinedAt: dbStatus.matchedUser.joinedAt,
    noteCount: dbStatus.matchedUser.noteUsageCount,
    profilePhotoUrl: clerkUser.imageUrl ?? dbStatus.matchedUser.profilePhotoUrl,
    schoolAccentColor: dbStatus.matchedUser.schoolAccentColor,
    schoolLogoUrl: getMatchedSchoolLogoUrl(dbStatus.matchedUser.schoolName),
    schoolLocation: dbStatus.matchedUser.schoolLocation,
    schoolName: dbStatus.matchedUser.schoolName,
    schoolPrimaryColor: dbStatus.matchedUser.schoolPrimaryColor,
  };

  return (
    <RootHomeShell
      initialNoteUsageCount={dbStatus.matchedUser.noteUsageCount}
      profile={profile}
    />
  );
}
