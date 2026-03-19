import { auth, currentUser } from "@clerk/nextjs/server";
import PersonalInfoView from "@/components/personal-info/personal-info";
import RootHomeShell from "@/components/root-home-shell";
import SignInView from "@/components/sing-in/sign-in";
import SignUpView from "@/components/sign-up/sign-up";
import { prisma } from "@/lib/prisma";

type DbStatus = {
  ok: boolean;
  matchedUser: {
    id: string;
    age: number | null;
    email: string;
    fullName: string;
    schoolId: string | null;
    noteUsageCount: number;
  } | null;
  error: string | null;
};

async function getDbStatus(clerkId: string | null): Promise<DbStatus> {
  try {
    const matchedUser = clerkId
      ? await prisma.user.findUnique({
          where: { clerkId },
          select: {
            id: true,
            age: true,
            email: true,
            fullName: true,
            schoolId: true,
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

    return {
      ok: true,
      matchedUser: matchedUser
        ? {
            id: matchedUser.id,
            age: matchedUser.age,
            email: matchedUser.email,
            fullName: matchedUser.fullName,
            schoolId: matchedUser.schoolId,
            noteUsageCount: matchedUser._count.notes,
          }
        : null,
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

type HomeProps = {
  searchParams?: Promise<{
    step?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const { userId } = await auth();

  if (!userId) {
    return (
      <main className="min-h-[calc(100vh-4rem)] grid place-items-center px-6">
        <SignInView />
      </main>
    );
  }

  const [dbStatus, clerkUser] = await Promise.all([
    getDbStatus(userId),
    currentUser(),
  ]);

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

  if (
    resolvedSearchParams.step === "school" ||
    dbStatus.matchedUser.schoolId === null
  ) {
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

  return (
    <RootHomeShell initialNoteUsageCount={dbStatus.matchedUser.noteUsageCount} />
  );
}
